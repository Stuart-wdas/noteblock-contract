import express from 'express';
import {
  WebSocketChannel,
  WebSocketOptions,
  Subscription,
  TimeoutError,
  WebSocketNotConnectedError,
} from 'starknet';

const app = express();

async function listen() {
  const options: WebSocketOptions = {
    nodeUrl: '...',
    autoReconnect: true, // Default: true
    reconnectOptions: {
      retries: 5, // Default: 5
      delay: 2000, // Default: 2000ms
    },
    requestTimeout: 60000, // Default: 60000ms
    maxBufferSize: 1000, // Default: 1000 events per subscription
  };
  const channel = new WebSocketChannel(options);

  const sub: Subscription = await channel.subscribeNewHeads();

  sub.on((data: any) => {
    console.log('Received new block header:', data.block_number);
  });

  try {
    const result = await channel.sendReceive('starknet_chainId');
    console.log(result);
  } catch (e) {
    if (e instanceof TimeoutError) {
      console.error('The request timed out!');
    } else if (e instanceof WebSocketNotConnectedError) {
      console.error('The WebSocket is not connected.');
    } else {
      console.error('An unknown error occurred:', e);
    }
  }
}

app.listen(() => {
  console.log(`Example app listening on port`);
  listen();
});
