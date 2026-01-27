#!/usr/bin/env npx ts-node
/**
 * Script to check Pinecone index configuration including metric type.
 *
 * Run with: npx ts-node -r dotenv/config scripts/check-pinecone-index.ts
 * Or: pnpm tsx scripts/check-pinecone-index.ts (after loading .env)
 *
 * Alternatively, run directly:
 *   PINECONE_API_KEY=your_key PINECONE_INDEX=your_index npx ts-node scripts/check-pinecone-index.ts
 */

import { Pinecone } from '@pinecone-database/pinecone';

// Note: Load .env with -r dotenv/config flag or set env vars directly

async function checkPineconeIndex() {
  const indexName = process.env.PINECONE_INDEX;

  if (!indexName) {
    console.error('❌ PINECONE_INDEX environment variable not set');
    process.exit(1);
  }

  console.log(`\n🔍 Checking Pinecone index: ${indexName}\n`);

  try {
    const pinecone = new Pinecone();

    // Get index description
    const indexDescription = await pinecone.describeIndex(indexName);

    console.log('📊 Index Configuration:');
    console.log('─'.repeat(40));
    console.log(`  Name:       ${indexDescription.name}`);
    console.log(`  Dimension:  ${indexDescription.dimension}`);
    console.log(`  Metric:     ${indexDescription.metric}`);
    console.log(`  Host:       ${indexDescription.host}`);

    if (indexDescription.spec?.serverless) {
      console.log(`  Cloud:      ${indexDescription.spec.serverless.cloud}`);
      console.log(`  Region:     ${indexDescription.spec.serverless.region}`);
    }

    console.log(`  Status:     ${indexDescription.status?.ready ? '✅ Ready' : '⏳ Not ready'}`);

    // Get index stats
    const index = pinecone.Index(indexName);
    const stats = await index.describeIndexStats();

    console.log('\n📈 Index Statistics:');
    console.log('─'.repeat(40));
    console.log(`  Total Vectors:  ${stats.totalRecordCount || 0}`);

    if (stats.namespaces) {
      console.log('  Namespaces:');
      for (const [ns, nsStats] of Object.entries(stats.namespaces)) {
        const displayName = ns || '(default)';
        console.log(`    - ${displayName}: ${nsStats.recordCount} vectors`);
      }
    }

    // Score interpretation based on metric
    console.log('\n📝 Score Interpretation:');
    console.log('─'.repeat(40));
    switch (indexDescription.metric) {
      case 'cosine':
        console.log('  Metric: Cosine Similarity');
        console.log('  Range:  -1 to 1 (1 = identical, 0 = orthogonal, -1 = opposite)');
        console.log('  Filter: Use score > minScore (higher is better)');
        break;
      case 'dotproduct':
        console.log('  Metric: Dot Product');
        console.log('  Range:  -∞ to +∞ (higher = more similar for normalized vectors)');
        console.log('  Filter: Use score > minScore (higher is better)');
        console.log('  Note:   Works best with normalized vectors');
        break;
      case 'euclidean':
        console.log('  Metric: Euclidean Distance');
        console.log('  Range:  0 to +∞ (0 = identical, higher = less similar)');
        console.log('  Filter: Use score < maxDistance (LOWER is better!)');
        console.log('  ⚠️  Your current code uses "score > minScore" which is INVERTED for euclidean!');
        break;
      default:
        console.log(`  Unknown metric: ${indexDescription.metric}`);
    }

    // Check for configuration mismatches
    const embeddingModel = process.env.EMBEDDING_MODEL || process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
    const expectedDimension = embeddingModel.includes('large') ? 3072 : 1536;

    console.log('\n🔧 Configuration Check:');
    console.log('─'.repeat(40));
    console.log(`  Embedding Model: ${embeddingModel}`);
    console.log(`  Expected Dim:    ${expectedDimension}`);
    console.log(`  Actual Dim:      ${indexDescription.dimension}`);

    if (indexDescription.dimension !== expectedDimension) {
      console.log('  ⚠️  DIMENSION MISMATCH! Update EMBEDDING_MODEL or recreate index.');
    } else {
      console.log('  ✅ Dimensions match');
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ Error checking Pinecone index:', error);
    process.exit(1);
  }
}

checkPineconeIndex();
