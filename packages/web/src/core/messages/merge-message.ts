// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import type {
  ChatEvent,
  InterruptEvent,
  MessageChunkEvent,
  ToolCallChunksEvent,
  ToolCallResultEvent,
  ToolCallsEvent,
} from "../api";
import { deepClone } from "../utils/deep-clone";

import type { Message } from "./types";

export function mergeMessage(message: Message, event: ChatEvent) {
  if (event.type === "message_chunk") {
    mergeTextMessage(message, event);
  } else if (event.type === "tool_calls" || event.type === "tool_call_chunks") {
    mergeToolCallMessage(message, event);
  } else if (event.type === "tool_call_result") {
    mergeToolCallResultMessage(message, event);
  } else if (event.type === "interrupt") {
    mergeInterruptMessage(message, event);
  }
  if (event.data.finish_reason) {
    message.finish_reason = event.data.finish_reason;
    message.isStreaming = false;
    if (message.tool_calls) {
      message.tool_calls.forEach((tool_call) => {
        if (tool_call.args_chunks?.length) {
          tool_call.args = JSON.parse(tool_call.args_chunks.join(""));
          delete tool_call.args_chunks;
        }
      });
    }
  }
  return deepClone(message);
}

function mergeTextMessage(message: Message, event: MessageChunkEvent) {
  if (event.data.content) {
    message.content += event.data.content;
    message.content_chunks.push(event.data.content);
  }
}

function mergeToolCallMessage(
  message: Message,
  event: ToolCallsEvent | ToolCallChunksEvent,
) {
  if (event.type === "tool_calls" && event.data.tool_calls[0]?.name) {
    message.tool_calls = event.data.tool_calls.map((raw) => ({
      id: raw.id,
      name: raw.name,
      args: raw.args,
      result: undefined,
    }));
  }

  message.tool_calls ??= [];
  for (const chunk of event.data.tool_call_chunks) {
    if (chunk.id) {
      const tool_call = message.tool_calls.find(
        (tool_call) => tool_call.id === chunk.id,
      );
      if (tool_call) {
        tool_call.args_chunks = [chunk.args];
      }
    } else {
      const streaming_tool_call = message.tool_calls.find(
        (tool_call) => tool_call.args_chunks?.length,
      );
      if (streaming_tool_call) {
        streaming_tool_call.args_chunks!.push(chunk.args);
      }
    }
  }
}

function mergeToolCallResultMessage(
  message: Message,
  event: ToolCallResultEvent,
) {
  const tool_call = message.tool_calls?.find(
    (tool_call) => tool_call.id === event.data.tool_call_id,
  );
  if (tool_call) {
    tool_call.result = event.data.content;
  }
}

function mergeInterruptMessage(message: Message, event: InterruptEvent) {
  message.isStreaming = false;
  message.options = event.data.options;
}
