import { PercentageCalculator } from './components/PercentageCalculator.jsx';
import { DiscountCalculator } from './components/DiscountCalculator.jsx';
import { AgeCalculator } from './components/AgeCalculator.jsx';
import { DateDifference } from './components/DateDifference.jsx';
import { UnitConverter } from './components/UnitConverter.jsx';
import { WordCounter } from './components/WordCounter.jsx';
import { CharacterCounter } from './components/CharacterCounter.jsx';
import { CaseConverter } from './components/CaseConverter.jsx';
import { PasswordGenerator } from './components/PasswordGenerator.jsx';
import { QrGenerator } from './components/QrGenerator.jsx';

// Reviewed local implementations (built in the web app; no backend endpoint).
// Rules live next to each component — see component headers.
export const LOCAL_TOOLS = {
  'percentage-calculator': PercentageCalculator,
  'discount-calculator': DiscountCalculator,
  'age-calculator': AgeCalculator,
  'date-difference': DateDifference,
  'unit-converter': UnitConverter,
  'word-counter': WordCounter,
  'character-counter': CharacterCounter,
  'case-converter': CaseConverter,
  'password-generator': PasswordGenerator,
  'qr-generator': QrGenerator,
};

export function getLocalTool(slug) {
  return LOCAL_TOOLS[slug] || null;
}
