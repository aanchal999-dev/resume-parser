import { resumeWorker } from './workers/resume.worker';

console.log('⚙️ Background Resume Processing Worker Service is running...');

process.on('SIGTERM', async () => {
  console.log('Shutting down Resume Worker process...');
  await resumeWorker.close();
  process.exit(0);
});
