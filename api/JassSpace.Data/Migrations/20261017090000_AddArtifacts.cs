using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable
namespace JassSpace.Data.Migrations;

public partial class AddArtifacts : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder) => migrationBuilder.Sql("""
CREATE TABLE "Artifacts" (
    "Id" uuid NOT NULL,
    "ContentId" uuid NOT NULL,
    "OwnerUserId" uuid,
    "Title" character varying(200) NOT NULL,
    "PrivateNote" character varying(4000),
    "OriginalFileName" character varying(255) NOT NULL,
    "StorageKey" character varying(128) NOT NULL,
    "MediaType" character varying(128) NOT NULL,
    "SizeBytes" bigint NOT NULL,
    "State" character varying(32) NOT NULL,
    "CreatedAt" timestamp with time zone NOT NULL,
    "UpdatedAt" timestamp with time zone,
    "DeletedAt" timestamp with time zone,
    CONSTRAINT "PK_Artifacts" PRIMARY KEY ("Id"),
    CONSTRAINT "CK_Artifacts_SizeBytes" CHECK ("SizeBytes" > 0),
    CONSTRAINT "FK_Artifacts_Contents_ContentId" FOREIGN KEY ("ContentId") REFERENCES "Contents" ("Id") ON DELETE RESTRICT,
    CONSTRAINT "FK_Artifacts_Users_OwnerUserId" FOREIGN KEY ("OwnerUserId") REFERENCES "Users" ("Id") ON DELETE SET NULL
);
CREATE UNIQUE INDEX "IX_Artifacts_ContentId" ON "Artifacts" ("ContentId");
CREATE INDEX "IX_Artifacts_OwnerUserId" ON "Artifacts" ("OwnerUserId");
CREATE UNIQUE INDEX "IX_Artifacts_StorageKey" ON "Artifacts" ("StorageKey");
CREATE INDEX "IX_Artifacts_CreatedAt" ON "Artifacts" ("CreatedAt");
CREATE INDEX "IX_Artifacts_State" ON "Artifacts" ("State");
CREATE TABLE "ArtifactShareLinks" (
    "Id" uuid NOT NULL,
    "ArtifactId" uuid NOT NULL,
    "CreatedByUserId" uuid,
    "TokenHash" character varying(64) NOT NULL,
    "ExpiresAt" timestamp with time zone,
    "MaxDownloads" integer,
    "DownloadCount" integer NOT NULL,
    "RevokedAt" timestamp with time zone,
    "CreatedAt" timestamp with time zone NOT NULL,
    "UpdatedAt" timestamp with time zone,
    CONSTRAINT "PK_ArtifactShareLinks" PRIMARY KEY ("Id"),
    CONSTRAINT "CK_ArtifactShareLinks_MaxDownloads" CHECK ("MaxDownloads" IS NULL OR "MaxDownloads" > 0),
    CONSTRAINT "CK_ArtifactShareLinks_DownloadCount" CHECK ("DownloadCount" >= 0),
    CONSTRAINT "FK_ArtifactShareLinks_Artifacts_ArtifactId" FOREIGN KEY ("ArtifactId") REFERENCES "Artifacts" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_ArtifactShareLinks_Users_CreatedByUserId" FOREIGN KEY ("CreatedByUserId") REFERENCES "Users" ("Id") ON DELETE SET NULL
);
CREATE INDEX "IX_ArtifactShareLinks_ArtifactId" ON "ArtifactShareLinks" ("ArtifactId");
CREATE INDEX "IX_ArtifactShareLinks_CreatedByUserId" ON "ArtifactShareLinks" ("CreatedByUserId");
CREATE UNIQUE INDEX "IX_ArtifactShareLinks_TokenHash" ON "ArtifactShareLinks" ("TokenHash");
CREATE TABLE "ArtifactDownloadGrants" (
    "Id" uuid NOT NULL,
    "ArtifactShareLinkId" uuid NOT NULL,
    "TokenHash" character varying(64) NOT NULL,
    "ProtectedToken" text NOT NULL,
    "IdempotencyKey" uuid NOT NULL,
    "ActiveStreams" integer NOT NULL,
    "CreatedAt" timestamp with time zone NOT NULL,
    "ExpiresAt" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_ArtifactDownloadGrants" PRIMARY KEY ("Id"),
    CONSTRAINT "CK_ArtifactDownloadGrants_ActiveStreams" CHECK ("ActiveStreams" >= 0 AND "ActiveStreams" <= 2),
    CONSTRAINT "FK_ArtifactDownloadGrants_ArtifactShareLinks_ArtifactShareLinkId" FOREIGN KEY ("ArtifactShareLinkId") REFERENCES "ArtifactShareLinks" ("Id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "IX_ArtifactDownloadGrants_TokenHash" ON "ArtifactDownloadGrants" ("TokenHash");
CREATE UNIQUE INDEX "IX_ArtifactDownloadGrants_ArtifactShareLinkId_IdempotencyKey" ON "ArtifactDownloadGrants" ("ArtifactShareLinkId", "IdempotencyKey");
CREATE INDEX "IX_ArtifactDownloadGrants_ExpiresAt" ON "ArtifactDownloadGrants" ("ExpiresAt");
""");

    protected override void Down(MigrationBuilder migrationBuilder) => migrationBuilder.Sql("""
DROP TABLE "ArtifactDownloadGrants";
DROP TABLE "ArtifactShareLinks";
DROP TABLE "Artifacts";
DELETE FROM "Contents" WHERE "ContentType" = 5;
""");
}
