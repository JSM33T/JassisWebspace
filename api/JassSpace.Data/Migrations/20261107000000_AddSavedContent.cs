using JassSpace.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JassSpace.Data.Migrations;

[DbContext(typeof(JassSpaceDbContext))]
[Migration("20261107000000_AddSavedContent")]
public sealed class AddSavedContent : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<int>(name: "Revision", table: "Contents", type: "integer", nullable: false, defaultValue: 1);

        migrationBuilder.CreateTable(
            name: "ContentRevisions",
            columns: table => new
            {
                ContentId = table.Column<Guid>(type: "uuid", nullable: false),
                Revision = table.Column<int>(type: "integer", nullable: false),
                ChangedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                Summary = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_ContentRevisions", x => new { x.ContentId, x.Revision });
                table.ForeignKey("FK_ContentRevisions_Contents_ContentId", x => x.ContentId, "Contents", "Id", onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "SavedContents",
            columns: table => new
            {
                UserId = table.Column<Guid>(type: "uuid", nullable: false),
                ContentId = table.Column<Guid>(type: "uuid", nullable: false),
                CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                SavedRevision = table.Column<int>(type: "integer", nullable: false),
                LastViewedRevision = table.Column<int>(type: "integer", nullable: true),
                LastViewedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_SavedContents", x => new { x.UserId, x.ContentId });
                table.ForeignKey("FK_SavedContents_Contents_ContentId", x => x.ContentId, "Contents", "Id", onDelete: ReferentialAction.Cascade);
                table.ForeignKey("FK_SavedContents_Users_UserId", x => x.UserId, "Users", "Id", onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(name: "IX_SavedContents_ContentId", table: "SavedContents", column: "ContentId");
        migrationBuilder.CreateIndex(name: "IX_SavedContents_UserId_CreatedAt_ContentId", table: "SavedContents", columns: new[] { "UserId", "CreatedAt", "ContentId" }, descending: new[] { false, true, true });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "ContentRevisions");
        migrationBuilder.DropTable(name: "SavedContents");
        migrationBuilder.DropColumn(name: "Revision", table: "Contents");
    }
}
