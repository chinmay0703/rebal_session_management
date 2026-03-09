import webpush from 'web-push';
import { connectDB } from './mongodb';
import PushSubscription from '@/models/PushSubscription';

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BKB-vTi_Jp1pna3ttcFBTetuhf-GVHX59TTepMtjZXg9S1I9PLdq4qyoPb4g7-MRVCE7XusZAET8Ou67OeRHKg0';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || 'm1wVO2hI-KCLZyr6MtyZ4iWgcEcIZMsIyJ2FLzXN2AE';

webpush.setVapidDetails(
  'mailto:admin@rebalance.com',
  VAPID_PUBLIC,
  VAPID_PRIVATE
);

export async function sendPushToAll(title: string, body: string, url?: string) {
  await connectDB();
  const subscriptions = await PushSubscription.find().lean();

  const payload = JSON.stringify({
    title,
    body,
    url: url || '/admin/dashboard',
    icon: '/logo.jpg',
  });

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          payload
        );
      } catch (err: unknown) {
        // Remove expired/invalid subscriptions
        if (err && typeof err === 'object' && 'statusCode' in err) {
          const statusCode = (err as { statusCode: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await PushSubscription.deleteOne({ endpoint: sub.endpoint });
          }
        }
      }
    })
  );

  return results;
}
