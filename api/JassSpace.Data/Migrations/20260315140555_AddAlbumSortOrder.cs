using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JassSpace.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAlbumSortOrder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SortOrder",
                table: "Albums",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_Albums_SortOrder",
                table: "Albums",
                column: "SortOrder");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Albums_SortOrder",
                table: "Albums");

            migrationBuilder.DropColumn(
                name: "SortOrder",
                table: "Albums");
        }
    }
}
