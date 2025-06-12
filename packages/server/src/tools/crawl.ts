// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import axios from 'axios';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';

/**
 * Internal crawl function that handles the entire crawling process
 */
async function _crawl({ url }: { url: string }): Promise<string> {
  try {
    // Step 1: Use Jina API to fetch and parse the webpage content
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Return-Format': 'html'
    };

    const jinaApiKey = process.env.JINA_API_KEY;
    if (jinaApiKey) {
      headers['Authorization'] = `Bearer ${jinaApiKey}`;
    } else {
      console.warn(
        'Jina API key is not set. Provide your own key to access a higher rate limit. See https://jina.ai/reader for more information.'
      );
    }

    const response = await axios.post(
      'https://r.jina.ai/',
      { url },
      {
        headers,
        timeout: 30000
      }
    );

    // Step 2: Parse HTML with JSDOM
    const dom = new JSDOM(response.data, { url });
    const document = dom.window.document;

    // Step 3: Extract readable content using Mozilla Readability
    const reader = new Readability(document);
    const article = reader.parse();

    if (!article) {
      throw new Error('Failed to extract readable content from the webpage');
    }

    // Step 4: Convert HTML to Markdown
    const turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
      emDelimiter: '*',
      strongDelimiter: '**'
    });

    // Configure turndown to handle more elements
    turndownService.addRule('removeScript', {
      filter: ['script', 'style', 'noscript'],
      replacement: () => ''
    });

    turndownService.addRule('preserveImages', {
      filter: 'img',
      replacement: (content, node) => {
        const alt = (node as Element).getAttribute('alt') || '';
        const src = (node as Element).getAttribute('src') || '';
        return src ? `![${alt}](${src})` : '';
      }
    });

    // Step 5: Build markdown content
    let markdown = '';
    if (article.title) {
      markdown += `# ${article.title}\n\n`;
    }

    const convertedContent = turndownService.turndown(article.content || '');
    markdown += convertedContent;

    return JSON.stringify({
      url: url,
      crawled_content: convertedContent
    });

  } catch (error) {
    const errorMsg = `Failed to crawl ${url}. Error: ${error}`;
    console.error(errorMsg);
    return JSON.stringify({
      url: url,
      error: errorMsg
    });
  }
}

/**
 * Crawl tool for LangChain
 */
export const crawlTool = tool(_crawl, {
  name: 'crawl_tool',
  description: 'Use this to crawl a url and get a readable content in markdown format.',
  schema: z.object({
    url: z.string().describe('The url to crawl.')
  })
});
