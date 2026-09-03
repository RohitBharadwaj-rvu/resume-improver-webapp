function extractJsonFromText(text) {
  if (!text) return null;

  // 1. Try markdown code blocks first
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch (e) {
      // Fall through to brace counter
    }
  }

  // 2. Balanced brace counter
  const firstBrace = text.search(/[\{\[]/);
  if (firstBrace === -1) return null;

  const openChar = text[firstBrace];
  const closeChar = openChar === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = firstBrace; i < text.length; i++) {
    const char = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === openChar) depth++;
      else if (char === closeChar) {
        depth--;
        if (depth === 0) {
          const jsonSub = text.slice(firstBrace, i + 1);
          try {
            return JSON.parse(jsonSub);
          } catch (err) {
            // try removing trailing commas
            const cleaned = jsonSub.replace(/,\s*([\}\]])/g, '$1');
            return JSON.parse(cleaned);
          }
        }
      }
    }
  }

  return null;
}

// Test case 1: Text after JSON (the exact error from user screenshot!)
const test1 = 'Here is your evaluation:\n{"overallScore": 85, "keywords": [{"keyword": "PRD", "foundInResume": true}]}\n\nHere are some extra tips: make sure to update your LinkedIn.';
console.log('Test 1 Parsed:', extractJsonFromText(test1));

// Test case 2: Markdown fenced code block
const test2 = '```json\n{\n  "overallScore": 92,\n  "keywords": []\n}\n```\nAdditional comments.';
console.log('Test 2 Parsed:', extractJsonFromText(test2));

// Test case 3: Array format
const test3 = '[{"id": "1", "title": "Test"}]\nHope this helps!';
console.log('Test 3 Parsed:', extractJsonFromText(test3));
