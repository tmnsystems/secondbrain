const fs = require('fs');
const path = require('path');

// Configuration
const topicDbDir = path.join(__dirname, '..', '..', 'topic_database');
const topicsDbFile = path.join(topicDbDir, 'topics_database.json');

console.log(`Checking if topics database exists at: ${topicsDbFile}`);

if (!fs.existsSync(topicsDbFile)) {
  console.log('Topics database file not found!');
  process.exit(1);
}

try {
  const topicsData = JSON.parse(fs.readFileSync(topicsDbFile, 'utf8'));
  console.log('Topics database loaded successfully');
  console.log(`Number of topics: ${Object.keys(topicsData).length}`);
  
  // Display the first few topics
  const topics = Object.keys(topicsData).slice(0, 3);
  console.log('Sample topics:');
  topics.forEach(topic => {
    console.log(`- ${topic} (${topicsData[topic].category})`);
  });
} catch (error) {
  console.error(`Error loading topics database: ${error.message}`);
  process.exit(1);
}