// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { buildRetriever } from '../rag';
import type { Resource } from '../rag';

/**
 * RAG 资源请求模式
 */
const RAGResourceRequestSchema = z.object({
  query: z.string().optional().describe('The query of the resource need to be searched')
});

/**
 * RAG 资源响应模式
 */
const RAGResourcesResponseSchema = z.object({
  resources: z.array(z.object({
    uri: z.string(),
    title: z.string(),
    description: z.string().optional()
  }))
});

type RAGResourceRequest = z.infer<typeof RAGResourceRequestSchema>;
type RAGResourcesResponse = z.infer<typeof RAGResourcesResponseSchema>;

/**
 * RAG 路由
 */
export async function ragRoutes(fastify: FastifyInstance) {
  // GET /api/rag/resources - 获取 RAG 资源列表
  fastify.withTypeProvider<ZodTypeProvider>().get<{ 
    Querystring: RAGResourceRequest 
  }>(
    '/api/rag/resources',
    {
      schema: {
        querystring: RAGResourceRequestSchema,
        response: {
          200: RAGResourcesResponseSchema
        }
      }
    },
    async (request, reply) => {
      try {
        const { query } = request.query;

        const retriever = buildRetriever();
        if (!retriever) {
          return reply.send({ resources: [] });
        }

        const resources = await retriever.listResources(query);
        
        const response: RAGResourcesResponse = {
          resources: resources.map(resource => ({
            uri: resource.uri,
            title: resource.title,
            description: resource.description || ''
          }))
        };

        return reply.send(response);
      } catch (error) {
        console.error('RAG resources error:', error);
        return reply.status(500).send({
          error: 'Failed to fetch RAG resources',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );
} 