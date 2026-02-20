import app from './index.js';

const PORT = Number(process.env.PORT ?? '3456');

app.listen(PORT, (error) => {
  if (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }

  console.log(`Flowershow MCP server listening on port ${PORT}`);
});

process.on('SIGINT', () => {
  console.log('Shutting down...');
  process.exit(0);
});
