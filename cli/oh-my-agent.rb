class OhMyAgent < Formula
  desc "Portable multi-agent harness for .agents-based skills and workflows"
  homepage "https://firstfluke.com/oh-my-agent/"
  url "https://registry.npmjs.org/oh-my-agent/-/oh-my-agent-15.0.4.tgz"
  sha256 "03bdba61a6977c90f30fd349f393a9174f5b0828513cc8c9cb8a30fc7dc031c9"
  license "MIT"

  bottle do
    sha256 cellar: :any, arm64_golden_gate: "2b8ef233e30140994f15e4cd6c73c1531e4a7d448492adc696dcec31660a3e0f"
    sha256 cellar: :any, arm64_tahoe:       "a275800254311e4a86c7e23ab10f1dd762cc5789b01526628e758ff043fb7fbd"
    sha256 cellar: :any, arm64_sequoia:     "d7dd75fdd635c2795300613de9402254a023213517964235f58dad8b3105126f"
    sha256 cellar: :any, arm64_linux:       "13c60040a2bc7827fe6ed3df2519c6b4d4febc95410b203e43a637efc20a5986"
    sha256 cellar: :any, x86_64_linux:      "047fc1ec1f884ea41ddeb4cd5c6ca57e210458a7abce8b0c3142e5f13cce7ac4"
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
