// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { config } from 'dotenv';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { tavily, TavilySearchResponse } from '@tavily/core';
import { Configuration } from '../config/configuration';
import { RunnableConfig } from '@langchain/core/runnables';

const apiKey = process.env.TAVILY_API_KEY;

if (!apiKey) {
  throw new Error('Tavily API key is required. Set TAVILY_API_KEY environment variable.');
}

/**
 * Tavily AI 搜索工具
 * 执行完整的网络搜索，返回与 clean_results_with_images 相同格式的结果
 */
export const tavilySearch = tool(
  async ({ query, includeDomains, excludeDomains, searchDepth, timeRange, topic }, config: RunnableConfig) => {
    const configurable = Configuration.fromRunnableConfig(config);
    const client = tavily({ apiKey });

    try {
      console.info(`Executing Tavily search for query: "${query}"`);
      const startTime = Date.now();

      const response = await client.search(query, {
        maxResults: configurable.max_search_results,
        includeRawContent: true, // markdown 格式
        includeImages: true,
        includeImageDescriptions: true,
        includeAnswer: false,
        searchDepth: searchDepth ?? 'advanced',
        includeDomains: includeDomains ?? [],
        excludeDomains: excludeDomains ?? [],
        timeRange: timeRange ?? undefined,
        topic: topic ?? undefined
      });

      // 格式化为与 clean_results_with_images 相同的格式
      const cleanResults: Array<any> = [];

      if (response.results) {
        for (const result of response.results) {
          const cleanResult = {
            type: 'page',
            title: result.title,
            url: result.url,
            content: result.content,
            score: result.score
          };

          cleanResults.push(cleanResult);
        }
      }

      // 添加图片结果
      if (response.images) {
        for (const image of response.images) {
          cleanResults.push({
            type: 'image',
            image_url: image.url,
            image_description: image.description || ''
          });
        }
      }

      const responseTime = Date.now() - startTime;
      console.info(`Tavily search completed in ${responseTime}ms, found ${cleanResults.length} results`);

      return JSON.stringify(cleanResults);
    } catch (error) {
      console.error('Tavily search error:', error);
      throw new Error(`Tavily search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
  {
    name: 'web_search_tool',
    description: `Search the web using Tavily AI-powered search engine. Returns structured search results including:
- Web pages with title, URL, content, and score
- Related images with URLs and descriptions
- Raw content in markdown format when available

Use this for current information, news, research, and any web-based queries.`,
    schema: z.object({
      query: z.string().describe('Search query to look up'),
      includeDomains: z
        .array(z.string())
        .optional()
        .describe(
          `A list of domains to restrict search results to.

      Use this parameter when:
      1. The user explicitly requests information from specific websites (e.g., "Find climate data from nasa.gov")
      2. The user mentions an organization or company without specifying the domain (e.g., "Find information about iPhones from Apple")

      In both cases, you should determine the appropriate domains (e.g., ["nasa.gov"] or ["apple.com"]) and set this parameter.

      Results will ONLY come from the specified domains - no other sources will be included.
      Default is None (no domain restriction).`
        ),
      excludeDomains: z
        .array(z.string())
        .optional()
        .describe(
          `A list of domains to exclude from search results.

      Use this parameter when:
      1. The user explicitly requests to avoid certain websites (e.g., "Find information about climate change but not from twitter.com")
      2. The user mentions not wanting results from specific organizations without naming the domain (e.g., "Find phone reviews but nothing from Apple")

      In both cases, you should determine the appropriate domains to exclude (e.g., ["twitter.com"] or ["apple.com"]) and set this parameter.

      Results will filter out all content from the specified domains.
      Default is None (no domain exclusion).`
        ),
      searchDepth: z
        .enum(['basic', 'advanced'])
        .optional()
        .describe(
          `Controls search thoroughness and result comprehensiveness.
    
    Use "basic" for simple queries requiring quick, straightforward answers.
    
    Use "advanced" (default) for complex queries, specialized topics, 
    rare information, or when in-depth analysis is needed.`
        ),
      timeRange: z
        .enum(['day', 'week', 'month', 'year'])
        .optional()
        .describe(
          `Limits results to content published within a specific timeframe.
    
    ONLY set this when the user explicitly mentions a time period 
    (e.g., "latest AI news," "articles from last week").
    
    For less popular or niche topics, use broader time ranges 
    ("month" or "year") to ensure sufficient relevant results.
    
    Options: "day" (24h), "week" (7d), "month" (30d), "year" (365d).
    
    Default is None.`
        ),
      topic: z
        .enum(['general', 'news', 'finance'])
        .optional()
        .describe(
          `Specifies search category for optimized results.
    
    Use "general" (default) for most queries, INCLUDING those with terms like 
    "latest," "newest," or "recent" when referring to general information.
    
    Use "finance" for markets, investments, economic data, or financial news.
    
    Use "news" ONLY for politics, sports, or major current events covered by 
    mainstream media - NOT simply because a query asks for "new" information.`
        )
    })
  }
);
