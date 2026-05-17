import type { RuleVariant } from '../types';
import type { RuleSet } from './index';
import { russianRules } from './russian';
import { internationalRules } from './international';
import { englishRules } from './english';

export const RULES: Record<RuleVariant, RuleSet> = {
  russian: russianRules,
  international: internationalRules,
  english: englishRules,
};

export function getRules(variant: RuleVariant): RuleSet {
  return RULES[variant];
}