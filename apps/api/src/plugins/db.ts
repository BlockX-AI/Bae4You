import fp from "fastify-plugin";
import { FastifyPluginAsync } from "fastify";
import { db } from "../db/client";

const dbPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate("db", db);

  fastify.addHook("onClose", async () => {
    await db.end();
  });
};

export default fp(dbPlugin, { name: "db" });

declare module "fastify" {
  interface FastifyInstance {
    db: typeof db;
  }
}
