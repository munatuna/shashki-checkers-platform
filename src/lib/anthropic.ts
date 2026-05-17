import Anthropic from '@anthropic-ai/sdk';

const key = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;

export const anthropic = new Anthropic({
  apiKey: key ?? '',
  dangerouslyAllowBrowser: true,
});
