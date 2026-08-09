const TALK_PROMPT_PREFIX = 'Press Enter to talk to ';

export function resolveDialogueMusicDuckingIntensity(
  interactionPrompt: string
): number {
  return interactionPrompt.startsWith(TALK_PROMPT_PREFIX) ? 1 : 0;
}
