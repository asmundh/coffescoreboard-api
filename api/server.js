/* eslint-disable no-underscore-dangle */
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import Router from 'koa-router';
import logger from 'koa-logger';
import Mongo from './mongo';
import { check, user } from './user';
import { installWebsocketsOnServer, sendNewCoffeeBrewingEvent } from './websocket';

const app = new Koa();
const router = new Router();
Mongo(app);

// GET user by RFID and all users
router
  .get('/users/:rfid', async (ctx) => {
    ctx.params.rfid = ctx.params.rfid;
    ctx.body = await ctx.app.users.findOne({ rfid: ctx.params.rfid });
    if (ctx.body == null) {
      ctx.status = 404;
      ctx.body = { error: 'No such user' };
    }
  })
  .get('/users', async (ctx) => {
    console.log('By all');
    ctx.body = await ctx.app.users.find().toArray();
  });

// Increment a users score. Increments "kaffeScore" by 1.
router
  .post('/users/:rfid', async (ctx) => {
    // const { body } = ctx.request;
    const rfidToFind = ctx.params.rfid;
    console.log(`Increasing coffeescore of ${rfidToFind}`);
    await ctx.app.users.findOneAndUpdate({
      rfid: rfidToFind,
    },
    { $inc: { kaffeScore: 1 } });
    sendNewCoffeeBrewingEvent();
    ctx.body = await ctx.app.users.findOne({ rfid: rfidToFind });
  });

// Create new user
router
  .post('/users', async (ctx) => {
    const { body } = await ctx.request;
    // Validate user data
    const valid = check(body, user)
         && !(await ctx.app.users.findOne({
           rfid: body.rfid,
         }));

    console.log(valid);
    // Insert into database
    if (valid) {
      await ctx.app.users.insertOne({
        name: body.name,
        study: body.study,
        rfid: body.rfid,
        kaffeScore: 0,
      });
      ctx.body = { created: true, body };
      ctx.status = 201;
    } else {
      ctx.status = 400;
      ctx.body = { created: false };
    }
  });

app.use(logger());
app.use(bodyParser());
app.use(cors());

app.use(router.routes(), router.allowedMethods());

const server = app.listen(3000);
installWebsocketsOnServer(server);

console.log('Listening on port 3000');
