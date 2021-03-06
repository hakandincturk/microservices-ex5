const amqp = require('amqplib');
const consola = require('consola');
const EventEmitter = require('events');
const uuid = require('uuid');

const RABBITMQ = 'rabbitmqurl';

// pseudo-queue for direct reply-to
const REPLY_QUEUE = 'amq.rabbitmq.reply-to';
const q = 'AUTH_QUEUE';

// Credits for Event Emitter goes to https://github.com/squaremo/amqp.node/issues/259

const createClient = rabbitmqconn =>
  amqp
    .connect(rabbitmqconn)
    .then(conn => conn.createChannel())
    .then(channel => {
      channel.responseEmitter = new EventEmitter();
      channel.responseEmitter.setMaxListeners(0);
			console.log('createClient clg');

      channel.consume(
        REPLY_QUEUE,
        msg => {
          channel.responseEmitter.emit(
            msg.properties.correlationId,
            msg.content.toString('utf8'),
          );
        },
        { noAck: true },
      );
      return channel;
    });

const sendRPCMessage = (channel, message, rpcQueue) =>
  new Promise(resolve => {
    const correlationId = uuid.v4();
    channel.responseEmitter.once(correlationId, resolve);
    channel.sendToQueue(rpcQueue, Buffer.from(message), {
      correlationId,
      replyTo: REPLY_QUEUE,
    });
  });

const init = async () => {
  const channel = await createClient(RABBITMQ);
  
  const message = { uuid: uuid.v4() };

  console.log(`[ ${new Date()} ] Message sent: ${JSON.stringify(message)}`);

  const respone = await sendRPCMessage(channel, JSON.stringify(message), q);
  
  console.log(`[ ${new Date()} ] Message received: ${respone}`);
  return respone;
};

try {
  const res = init();
  consola.success({message: res, badge: true});

} catch (e) {
  console.log(e);
}