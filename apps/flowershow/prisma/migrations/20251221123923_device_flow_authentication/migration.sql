-- CreateTable
CREATE TABLE "DeviceCode" (
    "id" TEXT NOT NULL,
    "device_code" TEXT NOT NULL,
    "user_code" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 5,
    "user_id" TEXT,
    "authorized" BOOLEAN NOT NULL DEFAULT false,
    "authorized_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CliToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "name" TEXT,
    "user_id" TEXT NOT NULL,
    "last_used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CliToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeviceCode_device_code_key" ON "DeviceCode"("device_code");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceCode_user_code_key" ON "DeviceCode"("user_code");

-- CreateIndex
CREATE INDEX "DeviceCode_device_code_idx" ON "DeviceCode"("device_code");

-- CreateIndex
CREATE INDEX "DeviceCode_user_code_idx" ON "DeviceCode"("user_code");

-- CreateIndex
CREATE INDEX "DeviceCode_expires_at_idx" ON "DeviceCode"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "CliToken_token_key" ON "CliToken"("token");

-- CreateIndex
CREATE INDEX "CliToken_user_id_idx" ON "CliToken"("user_id");

-- CreateIndex
CREATE INDEX "CliToken_token_idx" ON "CliToken"("token");

-- AddForeignKey
ALTER TABLE "DeviceCode" ADD CONSTRAINT "DeviceCode_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CliToken" ADD CONSTRAINT "CliToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
