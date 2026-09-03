function cleanExtractedTerm(term) {
  return term
    .replace(/^(own|lead|drive|build|design|manage|serve|establish|oversee|scale|deliver|implement|develop)\s+/i, '')
    .trim();
}

const input1 = "Own Product Requirement Documents (PRDs)";
const input2 = "Drive Cloud Adoption";
const input3 = "Oversee Global Compliance";

console.log(cleanExtractedTerm(input1));
console.log(cleanExtractedTerm(input2));
console.log(cleanExtractedTerm(input3));
