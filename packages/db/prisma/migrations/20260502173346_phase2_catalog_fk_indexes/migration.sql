-- CreateIndex
CREATE INDEX "role_plugins_providerId_idx" ON "role_plugins"("providerId");

-- CreateIndex
CREATE INDEX "roles_defaultProviderId_idx" ON "roles"("defaultProviderId");
