const STOP = new Set(['the','a','an','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','shall','should','may','might','must','can','could','and','or','not','no','nor','but','if','while','for','to','from','in','on','at','by','with','without','about','into','through','during','before','after','above','below','between','out','off','over','under','again','further','then','once','here','there','all','each','every','both','few','more','most','other','some','such','than','too','very','just','because','as','until','also','its','it','this','that','these','those','i','me','my','we','our','you','your','he','she','they','them','his','her','their','what','which','who','whom']);

export function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter((w) => w.length >= 3 && !STOP.has(w));
}

export function keywordOverlap(a: string[], b: string[]): number {
  const setB = new Set(b);
  return a.filter((w) => setB.has(w)).length;
}