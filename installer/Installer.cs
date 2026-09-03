using System;
using System.ComponentModel;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace ResumeATSImproverInstaller
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new InstallerForm());
        }
    }

    public class InstallerForm : Form
    {
        private TextBox txtInstallPath;
        private CheckBox chkDesktopShortcut;
        private CheckBox chkStartMenuShortcut;
        private CheckBox chkLaunchApp;
        private ProgressBar progressBar;
        private Label lblStatus;
        private Button btnInstall;
        private Button btnCancel;
        private Button btnBrowse;
        private WebClient webClient;
        private string tempZipPath;

        private const string GITHUB_RELEASE_URL = 
            "https://github.com/RohitBharadwaj-rvu/resume-improver-webapp/releases/latest/download/Resume-ATS-Improver-Windows-x64.zip";

        public InstallerForm()
        {
            InitializeComponent();
        }

        private void InitializeComponent()
        {
            this.Text = "Resume ATS Improver Setup";
            this.Size = new Size(560, 460);
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(248, 250, 252);
            this.Font = new Font("Segoe UI", 9F, FontStyle.Regular, GraphicsUnit.Point);

            // Header Banner
            Panel pnlHeader = new Panel
            {
                Dock = DockStyle.Top,
                Height = 85,
                BackColor = Color.FromArgb(15, 23, 42) // slate-900
            };

            Label lblTitle = new Label
            {
                Text = "Resume ATS Improver Setup",
                ForeColor = Color.White,
                Font = new Font("Segoe UI", 13F, FontStyle.Bold),
                Location = new Point(24, 18),
                AutoSize = true
            };

            Label lblSubtitle = new Label
            {
                Text = "AI-Powered Resume ATS Optimization & High-Fidelity Word Layout Editor",
                ForeColor = Color.FromArgb(148, 163, 184), // slate-400
                Font = new Font("Segoe UI", 8.5F),
                Location = new Point(25, 48),
                AutoSize = true
            };

            pnlHeader.Controls.Add(lblTitle);
            pnlHeader.Controls.Add(lblSubtitle);
            this.Controls.Add(pnlHeader);

            // Main Controls Container
            Panel pnlBody = new Panel
            {
                Location = new Point(24, 100),
                Size = new Size(500, 250)
            };

            // Destination folder label & input
            Label lblPath = new Label
            {
                Text = "Destination Folder:",
                Location = new Point(0, 5),
                AutoSize = true,
                Font = new Font("Segoe UI", 9F, FontStyle.Bold)
            };

            string defaultPath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "Programs",
                "Resume ATS Improver"
            );

            txtInstallPath = new TextBox
            {
                Text = defaultPath,
                Location = new Point(0, 28),
                Size = new Size(395, 25)
            };

            btnBrowse = new Button
            {
                Text = "Browse...",
                Location = new Point(405, 26),
                Size = new Size(95, 27),
                BackColor = Color.White,
                FlatStyle = FlatStyle.System
            };
            btnBrowse.Click += (s, e) =>
            {
                using (FolderBrowserDialog fbd = new FolderBrowserDialog())
                {
                    fbd.Description = "Select Installation Directory";
                    fbd.SelectedPath = txtInstallPath.Text;
                    if (fbd.ShowDialog() == DialogResult.OK)
                    {
                        txtInstallPath.Text = Path.Combine(fbd.SelectedPath, "Resume ATS Improver");
                    }
                }
            };

            // Options Checkboxes
            chkDesktopShortcut = new CheckBox
            {
                Text = "Create a Desktop shortcut",
                Checked = true,
                Location = new Point(0, 72),
                AutoSize = true
            };

            chkStartMenuShortcut = new CheckBox
            {
                Text = "Create a Start Menu shortcut",
                Checked = true,
                Location = new Point(0, 100),
                AutoSize = true
            };

            chkLaunchApp = new CheckBox
            {
                Text = "Launch Resume ATS Improver when setup is finished",
                Checked = true,
                Location = new Point(0, 128),
                AutoSize = true
            };

            // Progress Bar & Status
            lblStatus = new Label
            {
                Text = "Click Install to download and set up Resume ATS Improver.",
                Location = new Point(0, 168),
                Size = new Size(500, 32),
                ForeColor = Color.FromArgb(71, 85, 105) // slate-600
            };

            progressBar = new ProgressBar
            {
                Location = new Point(0, 205),
                Size = new Size(500, 20),
                Minimum = 0,
                Maximum = 100,
                Value = 0,
                Visible = false
            };

            pnlBody.Controls.Add(lblPath);
            pnlBody.Controls.Add(txtInstallPath);
            pnlBody.Controls.Add(btnBrowse);
            pnlBody.Controls.Add(chkDesktopShortcut);
            pnlBody.Controls.Add(chkStartMenuShortcut);
            pnlBody.Controls.Add(chkLaunchApp);
            pnlBody.Controls.Add(lblStatus);
            pnlBody.Controls.Add(progressBar);
            this.Controls.Add(pnlBody);

            // Bottom Actions Panel
            Panel pnlFooter = new Panel
            {
                Dock = DockStyle.Bottom,
                Height = 55,
                BackColor = Color.FromArgb(241, 245, 249) // slate-100
            };

            btnInstall = new Button
            {
                Text = "Install",
                Location = new Point(310, 12),
                Size = new Size(100, 32),
                BackColor = Color.FromArgb(37, 99, 235), // blue-600
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Font = new Font("Segoe UI", 9F, FontStyle.Bold)
            };
            btnInstall.FlatAppearance.BorderSize = 0;
            btnInstall.Click += BtnInstall_Click;

            btnCancel = new Button
            {
                Text = "Cancel",
                Location = new Point(420, 12),
                Size = new Size(100, 32),
                BackColor = Color.White,
                FlatStyle = FlatStyle.System
            };
            btnCancel.Click += (s, e) =>
            {
                if (webClient != null && webClient.IsBusy)
                {
                    webClient.CancelAsync();
                }
                this.Close();
            };

            pnlFooter.Controls.Add(btnInstall);
            pnlFooter.Controls.Add(btnCancel);
            this.Controls.Add(pnlFooter);
        }

        private async void BtnInstall_Click(object sender, EventArgs e)
        {
            string installPath = txtInstallPath.Text.Trim();
            if (string.IsNullOrEmpty(installPath))
            {
                MessageBox.Show("Please specify a valid installation directory.", "Invalid Path", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            // Disable controls during install
            txtInstallPath.Enabled = false;
            btnBrowse.Enabled = false;
            chkDesktopShortcut.Enabled = false;
            chkStartMenuShortcut.Enabled = false;
            chkLaunchApp.Enabled = false;
            btnInstall.Enabled = false;
            btnInstall.Text = "Installing...";
            progressBar.Visible = true;
            progressBar.Value = 0;

            lblStatus.Text = "Connecting to public GitHub repository...";

            tempZipPath = Path.Combine(Path.GetTempPath(), "Resume-ATS-Improver-" + Guid.NewGuid().ToString("N") + ".zip");

            try
            {
                ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12 | SecurityProtocolType.Tls11 | SecurityProtocolType.Tls;

                using (webClient = new WebClient())
                {
                    webClient.Headers.Add("User-Agent", "ResumeATSImprover-Installer");
                    webClient.DownloadProgressChanged += (s, args) =>
                    {
                        this.Invoke(new Action(() =>
                        {
                            progressBar.Value = args.ProgressPercentage;
                            double mbReceived = args.BytesReceived / 1024.0 / 1024.0;
                            double mbTotal = args.TotalBytesToReceive / 1024.0 / 1024.0;
                            if (mbTotal > 0)
                            {
                                lblStatus.Text = string.Format("Downloading from GitHub: {0}% ({1:F1} MB / {2:F1} MB)...",
                                    args.ProgressPercentage, mbReceived, mbTotal);
                            }
                            else
                            {
                                lblStatus.Text = string.Format("Downloading from GitHub: {0:F1} MB received...", mbReceived);
                            }
                        }));
                    };

                    await webClient.DownloadFileTaskAsync(new Uri(GITHUB_RELEASE_URL), tempZipPath);
                }

                lblStatus.Text = "Extracting files to installation directory...";
                progressBar.Style = ProgressBarStyle.Marquee;

                await Task.Run(() =>
                {
                    if (Directory.Exists(installPath))
                    {
                        try { Directory.Delete(installPath, true); } catch { }
                    }
                    Directory.CreateDirectory(installPath);

                    ZipFile.ExtractToDirectory(tempZipPath, installPath);
                });

                // Find executable
                string exePath = Path.Combine(installPath, "Resume ATS Improver.exe");
                if (!File.Exists(exePath))
                {
                    // Fallback search in extracted subfolder
                    string[] found = Directory.GetFiles(installPath, "Resume ATS Improver.exe", SearchOption.AllDirectories);
                    if (found.Length > 0)
                    {
                        exePath = found[0];
                        installPath = Path.GetDirectoryName(exePath);
                    }
                }

                lblStatus.Text = "Configuring application shortcuts...";

                // Create Desktop Shortcut if user opted in
                if (chkDesktopShortcut.Checked)
                {
                    string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
                    string shortcutPath = Path.Combine(desktopPath, "Resume ATS Improver.lnk");
                    CreateShortcut(shortcutPath, exePath, installPath, "Resume ATS Improver - AI Powered");
                }

                // Create Start Menu Shortcut if user opted in
                if (chkStartMenuShortcut.Checked)
                {
                    string startMenu = Path.Combine(
                        Environment.GetFolderPath(Environment.SpecialFolder.Programs),
                        "Resume ATS Improver"
                    );
                    Directory.CreateDirectory(startMenu);
                    string shortcutPath = Path.Combine(startMenu, "Resume ATS Improver.lnk");
                    CreateShortcut(shortcutPath, exePath, installPath, "Resume ATS Improver - AI Powered");
                }

                // Create clean uninstaller script
                CreateUninstaller(installPath);

                // Clean up temp zip
                if (File.Exists(tempZipPath))
                {
                    try { File.Delete(tempZipPath); } catch { }
                }

                progressBar.Style = ProgressBarStyle.Continuous;
                progressBar.Value = 100;
                lblStatus.Text = "Installation completed successfully!";

                if (chkLaunchApp.Checked && File.Exists(exePath))
                {
                    Process.Start(exePath);
                }

                MessageBox.Show(
                    "Resume ATS Improver has been successfully installed!",
                    "Installation Complete",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );

                this.Close();
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Installation failed: " + ex.Message,
                    "Setup Error",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );

                lblStatus.Text = "Installation failed: " + ex.Message;
                btnInstall.Enabled = true;
                btnInstall.Text = "Retry Install";
                txtInstallPath.Enabled = true;
                btnBrowse.Enabled = true;
                chkDesktopShortcut.Enabled = true;
                chkStartMenuShortcut.Enabled = true;
                chkLaunchApp.Enabled = true;
                progressBar.Visible = false;

                if (File.Exists(tempZipPath))
                {
                    try { File.Delete(tempZipPath); } catch { }
                }
            }
        }

        private void CreateShortcut(string shortcutPath, string targetExe, string workDir, string description)
        {
            try
            {
                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                dynamic shell = Activator.CreateInstance(shellType);
                dynamic shortcut = shell.CreateShortcut(shortcutPath);
                shortcut.TargetPath = targetExe;
                shortcut.WorkingDirectory = workDir;
                shortcut.Description = description;
                shortcut.Save();
            }
            catch (Exception ex)
            {
                Console.WriteLine("Shortcut creation error: " + ex.Message);
            }
        }

        private void CreateUninstaller(string installPath)
        {
            try
            {
                string uninstallerBat = Path.Combine(installPath, "Uninstall.bat");
                string content = "@echo off\r\n" +
                    "echo Uninstalling Resume ATS Improver...\r\n" +
                    "taskkill /F /IM \"Resume ATS Improver.exe\" 2>nul\r\n" +
                    "del \"%USERPROFILE%\\Desktop\\Resume ATS Improver.lnk\" 2>nul\r\n" +
                    "del \"%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Resume ATS Improver\\Resume ATS Improver.lnk\" 2>nul\r\n" +
                    "rmdir \"%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Resume ATS Improver\" 2>nul\r\n" +
                    "start /b \"\" cmd /c timeout /t 1 /nobreak ^>nul ^& rmdir /s /q \"" + installPath + "\"\r\n" +
                    "exit\r\n";

                File.WriteAllText(uninstallerBat, content);
            }
            catch { }
        }
    }
}
