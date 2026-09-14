class OhMyAgent < Formula
  desc "Portable multi-agent harness for .agents-based skills and workflows"
  homepage "https://firstfluke.com/oh-my-agent/"
  url "https://registry.npmjs.org/oh-my-agent/-/oh-my-agent-14.8.1.tgz"
  sha256 "52cd3456b70034e1283257a43c9d808ce93585d6c3eb0acb5b34a3c2976c579b"
  license "MIT"

  bottle do
    sha256 cellar: :any, arm64_golden_gate: "dea76aacaf7196fca0e5ec7b0f4a8fc865f336a2283730e42d34295354423519"
    sha256 cellar: :any, arm64_tahoe:       "0f79cf7c614dc7a4ab360659d4e833ef927545a4e7e820167d873bf544754cd3"
    sha256 cellar: :any, arm64_sequoia:     "89580d87506ca2e6fbd99cdc3a0cf3f1ca84301db7d9a79d63be4b88627b159b"
    sha256 cellar: :any, arm64_linux:       "cbcb61ed2465b5399a76a112016b43f4b93808d35ee0a415e8549dbc58b041dc"
    sha256 cellar: :any, x86_64_linux:      "9e7035c8a9a0765316ae0af938878061a2d5ec473cd5408bdf1728147400f0e5"
  end

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args

    node_modules = libexec/"lib/node_modules/oh-my-agent/node_modules"
    # Remove incompatible pre-built `bare-fs`/`bare-os`/`bare-path`/`bare-url` binaries
    os = OS.kernel_name.downcase
    arch = Hardware::CPU.intel? ? "x64" : Hardware::CPU.arch.to_s
    node_modules.glob("{bare-fs,bare-os,bare-path,bare-url}/prebuilds/*")
                .each { |dir| rm_r(dir) if dir.basename.to_s != "#{os}-#{arch}" }

    rm_r(node_modules.glob("better-sqlite3/prebuilds/*"))
    cd(node_modules/"better-sqlite3") { system "npm", "run", "build-release" }

    bin.install_symlink Dir[libexec/"bin/*"]
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/oh-my-agent --version")

    output = JSON.parse(shell_output("#{bin}/oh-my-agent memory init --json"))
    assert_empty output["updated"]
    assert_path_exists testpath/".agents/state/memories/orchestrator-session.md"
    assert_path_exists testpath/".agents/state/memories/task-board.md"
  end
end
