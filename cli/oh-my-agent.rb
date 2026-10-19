class OhMyAgent < Formula
  desc "Portable multi-agent harness for .agents-based skills and workflows"
  homepage "https://firstfluke.com/oh-my-agent/"
  url "https://registry.npmjs.org/oh-my-agent/-/oh-my-agent-20.5.1.tgz"
  sha256 "7f1071cdec5a21198866098fda8f1e2eed3bf82f58130e507468f2e375a0fe31"
  license "MIT"

  bottle do
    sha256 cellar: :any, arm64_golden_gate: "ecf7353df594a06fd6e7f572aa50f444e8306b9dfb9cea61f152af2bf95ea646"
    sha256 cellar: :any, arm64_tahoe:       "caca1640724a24aad760a5ab5412a6d859729972785c134dcfcde2803e00fe94"
    sha256 cellar: :any, arm64_sequoia:     "eebf6e05316138fa603297b812176875aae556f30ae41d6e045b70fcc8412da5"
    sha256 cellar: :any, arm64_linux:       "eb91d07fa3b74b03286516ac89302597dd960534161907fa76144c2bef5064c5"
    sha256 cellar: :any, x86_64_linux:      "aa889126111e4d449ae7bcd52edd4dace5979c02fff9f33f0a7c15079eed37f1"
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
