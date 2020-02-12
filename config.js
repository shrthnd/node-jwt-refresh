module.exports = {
  ACCESS_SECRET: process.env.ACCESS_SECRET || "lorem1ipsum2dolor3sit4amet678",
  POSTGRES_DB: "postgres://postgres:1234@localhost:5432/node_jwt_refresh",
  POSTGRES_SCHEMA_AUTH: "app_private",
  POSTGRES_SCHEMA: "app_public",
}