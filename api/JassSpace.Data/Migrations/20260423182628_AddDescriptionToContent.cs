using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JassSpace.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDescriptionToContent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Contents",
                type: "text",
                nullable: true);

            // Backfill Description from source tables for existing rows
            migrationBuilder.Sql("""
                UPDATE "Contents" c
                SET "Description" = b."Excerpt"
                FROM "Blogs" b
                WHERE c."ContentType" = 2
                  AND c."ContentRefId" = b."Id"
                  AND b."Excerpt" IS NOT NULL;

                UPDATE "Contents" c
                SET "Description" = a."Description"
                FROM "Albums" a
                WHERE c."ContentType" = 1
                  AND c."ContentRefId" = a."Id"
                  AND a."Description" IS NOT NULL;

                UPDATE "Contents" c
                SET "Description" = t."Description"
                FROM "Tracks" t
                WHERE c."ContentType" = 4
                  AND c."ContentRefId" = t."Id"
                  AND t."Description" IS NOT NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Description",
                table: "Contents");
        }
    }
}
