using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DicomLearning.GraphQL.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "user_study",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    StudyInstanceUid = table.Column<string>(type: "TEXT", nullable: false),
                    PatientId = table.Column<string>(type: "TEXT", nullable: false),
                    PatientName = table.Column<string>(type: "TEXT", nullable: false),
                    StudyDate = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    StudyDescription = table.Column<string>(type: "TEXT", nullable: false),
                    Modality = table.Column<string>(type: "TEXT", nullable: false),
                    AccessionNumber = table.Column<string>(type: "TEXT", nullable: false),
                    BodyPartExamined = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_study", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "user_series",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    SeriesInstanceUid = table.Column<string>(type: "TEXT", nullable: false),
                    SeriesNumber = table.Column<string>(type: "TEXT", nullable: false),
                    SeriesDescription = table.Column<string>(type: "TEXT", nullable: false),
                    Modality = table.Column<string>(type: "TEXT", nullable: false),
                    UserStudyId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_series", x => x.Id);
                    table.ForeignKey(
                        name: "FK_user_series_user_study_UserStudyId",
                        column: x => x.UserStudyId,
                        principalTable: "user_study",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_sop",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    SopInstanceUid = table.Column<string>(type: "TEXT", nullable: false),
                    InstanceNumber = table.Column<string>(type: "TEXT", nullable: false),
                    FilePath = table.Column<string>(type: "TEXT", nullable: false),
                    IsRead = table.Column<bool>(type: "INTEGER", nullable: false),
                    ReadAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: true),
                    ReadByUserId = table.Column<string>(type: "TEXT", nullable: true),
                    UserSeriesId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_sop", x => x.Id);
                    table.ForeignKey(
                        name: "FK_user_sop_user_series_UserSeriesId",
                        column: x => x.UserSeriesId,
                        principalTable: "user_series",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_user_series_SeriesInstanceUid",
                table: "user_series",
                column: "SeriesInstanceUid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_user_series_UserStudyId",
                table: "user_series",
                column: "UserStudyId");

            migrationBuilder.CreateIndex(
                name: "IX_user_sop_IsRead",
                table: "user_sop",
                column: "IsRead");

            migrationBuilder.CreateIndex(
                name: "IX_user_sop_SopInstanceUid",
                table: "user_sop",
                column: "SopInstanceUid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_user_sop_UserSeriesId",
                table: "user_sop",
                column: "UserSeriesId");

            migrationBuilder.CreateIndex(
                name: "IX_user_study_AccessionNumber",
                table: "user_study",
                column: "AccessionNumber");

            migrationBuilder.CreateIndex(
                name: "IX_user_study_PatientId",
                table: "user_study",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_user_study_PatientId_StudyDate",
                table: "user_study",
                columns: new[] { "PatientId", "StudyDate" });

            migrationBuilder.CreateIndex(
                name: "IX_user_study_StudyDate",
                table: "user_study",
                column: "StudyDate");

            migrationBuilder.CreateIndex(
                name: "IX_user_study_StudyInstanceUid",
                table: "user_study",
                column: "StudyInstanceUid",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "user_sop");

            migrationBuilder.DropTable(
                name: "user_series");

            migrationBuilder.DropTable(
                name: "user_study");
        }
    }
}
