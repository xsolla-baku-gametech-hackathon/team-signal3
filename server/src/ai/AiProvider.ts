import { AiDirectorInput, AiDirectorOutput } from './ai.types.js';

export interface AiProvider {
  decide(input: AiDirectorInput): Promise<AiDirectorOutput>;
}
