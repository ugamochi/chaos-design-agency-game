// Conversation System Validation Script
// Run with: node validate-conversations.js

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Conversation System...\n');

// Load conversations.json
const conversationsPath = path.join(__dirname, 'conversations.json');
const conversationsData = JSON.parse(fs.readFileSync(conversationsPath, 'utf8'));
const conversationIds = new Set(conversationsData.map(c => c.id));

console.log(`✅ Found ${conversationIds.size} conversations in conversations.json\n`);

// Load conversations.js to find all queueConversation() calls
const conversationsJsPath = path.join(__dirname, 'conversations.js');
const conversationsJsContent = fs.readFileSync(conversationsJsPath, 'utf8');

// Extract all conversation IDs referenced in queueConversation() calls
const queuePattern = /queueConversation\(['"]([^'"]+)['"]/g;
const referencedIds = new Set();
let match;

while ((match = queuePattern.exec(conversationsJsContent)) !== null) {
  referencedIds.add(match[1]);
}

console.log(`✅ Found ${referencedIds.size} conversation IDs referenced in code\n`);

// Check for missing conversations
const missingConversations = [];
referencedIds.forEach(id => {
  if (!conversationIds.has(id)) {
    missingConversations.push(id);
  }
});

// Check for unused conversations
const unusedConversations = [];
conversationIds.forEach(id => {
  if (!referencedIds.has(id)) {
    unusedConversations.push(id);
  }
});

// Report results
console.log('═══════════════════════════════════════════════════════════');
console.log('VALIDATION RESULTS');
console.log('═══════════════════════════════════════════════════════════\n');

if (missingConversations.length === 0) {
  console.log('✅ All referenced conversations exist in conversations.json');
} else {
  console.log(`❌ MISSING CONVERSATIONS (${missingConversations.length}):`);
  console.log('These are referenced in code but not in conversations.json:\n');
  missingConversations.forEach(id => {
    console.log(`  - ${id}`);
  });
}

console.log('');

if (unusedConversations.length === 0) {
  console.log('✅ All conversations in JSON are referenced in code');
} else {
  console.log(`⚠️  UNUSED CONVERSATIONS (${unusedConversations.length}):`);
  console.log('These exist in conversations.json but are not referenced in code:\n');
  console.log('(Note: Some might be triggered by spawnConversations or other mechanisms)\n');
  unusedConversations.forEach(id => {
    console.log(`  - ${id}`);
  });
}

console.log('\n═══════════════════════════════════════════════════════════');

// Validate conversation structure
console.log('\n🔍 Checking conversation structure...\n');

const structureIssues = [];

conversationsData.forEach((conv, index) => {
  // Check required fields
  if (!conv.id) structureIssues.push(`Conversation ${index}: Missing id`);
  if (!conv.urgency) structureIssues.push(`${conv.id}: Missing urgency`);
  if (!conv.from) structureIssues.push(`${conv.id}: Missing from`);
  if (!conv.subject) structureIssues.push(`${conv.id}: Missing subject`);
  if (!conv.body) structureIssues.push(`${conv.id}: Missing body`);
  if (!conv.choices || !Array.isArray(conv.choices)) {
    structureIssues.push(`${conv.id}: Missing or invalid choices array`);
  } else {
    // Check each choice
    conv.choices.forEach((choice, choiceIndex) => {
      if (!choice.id) structureIssues.push(`${conv.id} choice ${choiceIndex}: Missing choice id`);
      if (!choice.text) structureIssues.push(`${conv.id} choice ${choiceIndex}: Missing choice text`);
      if (!choice.consequences) structureIssues.push(`${conv.id} choice ${choiceIndex}: Missing consequences`);
    });
  }
  
  // Check for placeholder consistency
  if (conv.from && conv.from.includes('{Worker}')) {
    if (!conv.body || !conv.body.includes('{Worker}')) {
      console.log(`⚠️  ${conv.id}: Has {Worker} in 'from' but not in 'body'`);
    }
  }
  
  // Check for linkedProjectId when it should be present
  if (conv.body && conv.body.includes('project') && !conv.linkedProjectId) {
    console.log(`⚠️  ${conv.id}: Mentions project but has no linkedProjectId`);
  }
});

if (structureIssues.length === 0) {
  console.log('✅ All conversations have valid structure');
} else {
  console.log(`❌ STRUCTURE ISSUES (${structureIssues.length}):\n`);
  structureIssues.forEach(issue => {
    console.log(`  - ${issue}`);
  });
}

console.log('\n═══════════════════════════════════════════════════════════');
console.log('SUMMARY');
console.log('═══════════════════════════════════════════════════════════\n');

const totalIssues = missingConversations.length + structureIssues.length;
if (totalIssues === 0) {
  console.log('✅ ✅ ✅  VALIDATION PASSED - No issues found!');
} else {
  console.log(`❌ Found ${totalIssues} issue(s) that need attention`);
  if (missingConversations.length > 0) {
    console.log(`   - ${missingConversations.length} missing conversations`);
  }
  if (structureIssues.length > 0) {
    console.log(`   - ${structureIssues.length} structure issues`);
  }
}

console.log('\n');

// Exit with appropriate code
process.exit(totalIssues > 0 ? 1 : 0);
