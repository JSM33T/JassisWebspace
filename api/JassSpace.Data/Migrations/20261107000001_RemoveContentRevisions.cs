using JassSpace.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JassSpace.Data.Migrations;

[DbContext(typeof(JassSpaceDbContext))]
[Migration("20261107000001_RemoveContentRevisions")]
public sealed class RemoveContentRevisions : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "ContentRevisions");
        migrationBuilder.DropColumn(name: "Revision", table: "Contents");
        migrationBuilder.DropColumn(name: "SavedRevision", table: "SavedContents");
        migrationBuilder.DropColumn(name: "LastViewedRevision", table: "SavedContents");
        migrationBuilder.DropColumn(name: "LastViewedAt", table: "SavedContents");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<int>(name: "Revision", table: "Contents", type: "integer", nullable: false, defaultValue: 1);
        migrationBuilder.AddColumn<int>(name: "SavedRevision", table: "SavedContents", type: "integer", nullable: false, defaultValue: 1);
        migrationBuilder.AddColumn<int>(name: "LastViewedRevision", table: "SavedContents", type: "integer", nullable: true);
        migrationBuilder.AddColumn<DateTimeOffset>(name: "LastViewedAt", table: "SavedContents", type: "timestamp with time zone", nullable: true);
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
    }
}
