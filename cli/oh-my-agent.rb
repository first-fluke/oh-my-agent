class OhMyAgent < Formula
  desc "Portable multi-agent harness for .agents-based skills and workflows"
  homepage "https://firstfluke.com/oh-my-agent/"
  url "https://registry.npmjs.org/oh-my-agent/-/oh-my-agent-11.6.0.tgz"
  sha256 "7a6995a5f8132db09b6d2da1bc4838032896ac067c46ca77ccdba670b6ae145e"
  license "MIT"

  bottle do
    sha256 cellar: :any, arm64_tahoe:   "e5e91c44659d935e96375c4ac662b14b8afefcffecae1ef0fa1d8f97a634c22a"
    sha256 cellar: :any, arm64_sequoia: "220bff20d1ea9263bc1c079ae27bdb36187381d4fd4349f8b35fb34a5d39764c"
    sha256 cellar: :any, arm64_sonoma:  "cbdb0b3222d6f52737c7aa68ad8ee8ce76732386f9348999eab24e8eaa251415"
    sha256 cellar: :any, sonoma:        "c3cae21f7cb358acc8919fce0541bd8b23ede1d4b348ce2bb83cacdd32aaf43d"
    sha256 cellar: :any, arm64_linux:   "a83b7aa147ffe8bbc01be59081c74f4b6db0b38b18cf36f3022650e4e6958f7c"
    sha256 cellar: :any, x86_64_linux:  "a14d1e67341c34f92744ac32d63084489edbee9db269ff17d1431fe5f1195d51"
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

    output = JSON.parse(shell_output("#{bin}/oh-my-agent memory:init --json"))
    assert_empty output["updated"]
    assert_path_exists testpath/".agents/state/memories/orchestrator-session.md"
    assert_path_exists testpath/".agents/state/memories/task-board.md"
  end
end
