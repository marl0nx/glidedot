export const env = {
    get PORT() { return Number(process.env.PORT) || 3001; },
    get NODE_ENV() { return process.env.NODE_ENV || 'development'; },
    get DB_URL() { return process.env.DB_URL || 'data/db.sqlite'; },
    get S3_ENDPOINT() { return process.env.S3_ENDPOINT; },
    get S3_REGION() { return process.env.S3_REGION || 'us-east-1'; },
    get S3_BUCKET() { return process.env.S3_BUCKET; },
    get S3_ACCESS_KEY() { return process.env.S3_ACCESS_KEY; },
    get S3_SECRET_KEY() { return process.env.S3_SECRET_KEY; },
    get TRADUORA_URL() { return process.env.TRADUORA_URL; },
    get TRADUORA_PROJECT_ID() { return process.env.TRADUORA_PROJECT_ID; },
    get TRADUORA_CLIENT_ID() { return process.env.TRADUORA_CLIENT_ID; },
    get TRADUORA_CLIENT_SECRET() { return process.env.TRADUORA_CLIENT_SECRET; },
};

/* Env Variables Validation */
if (!process.env.DB_URL && env.NODE_ENV === 'production') {
    throw new Error("Missing DB_URL in production environment");
}