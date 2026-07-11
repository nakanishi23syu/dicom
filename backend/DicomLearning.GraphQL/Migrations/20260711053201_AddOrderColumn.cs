using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DicomLearning.GraphQL.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Order",
                table: "user_study",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Order",
                table: "user_sop",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Order",
                table: "user_series",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_user_study_Order",
                table: "user_study",
                column: "Order");

            migrationBuilder.CreateIndex(
                name: "IX_user_sop_Order",
                table: "user_sop",
                column: "Order");

            migrationBuilder.CreateIndex(
                name: "IX_user_series_Order",
                table: "user_series",
                column: "Order");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_user_study_Order",
                table: "user_study");

            migrationBuilder.DropIndex(
                name: "IX_user_sop_Order",
                table: "user_sop");

            migrationBuilder.DropIndex(
                name: "IX_user_series_Order",
                table: "user_series");

            migrationBuilder.DropColumn(
                name: "Order",
                table: "user_study");

            migrationBuilder.DropColumn(
                name: "Order",
                table: "user_sop");

            migrationBuilder.DropColumn(
                name: "Order",
                table: "user_series");
        }
    }
}
