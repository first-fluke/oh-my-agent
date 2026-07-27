class OhMyAgent < Formula
  desc "Portable multi-agent harness for .agents-based skills and workflows"
  homepage "https://firstfluke.com/oh-my-agent/"
  url "https://registry.npmjs.org/oh-my-agent/-/oh-my-agent-11.0.3.tgz"
  sha256 "536daea5e918c09b5207eb23081c1ca910b79c59043392f1e12c4324377bcd7f"
  license "MIT"

  bottle do
    sha256 cellar: :any, arm64_tahoe:   "8d999a802175914cb4268aa6da62e30bfaa765de8cd49f9fd41c25cae4470d3c"
    sha256 cellar: :any, arm64_sequoia: "8d999a802175914cb4268aa6da62e30bfaa765de8cd49f9fd41c25cae4470d3c"
    sha256 cellar: :any, arm64_sonoma:  "8d999a802175914cb4268aa6da62e30bfaa765de8cd49f9fd41c25cae4470d3c"
    sha256 cellar: :any, sonoma:        "2d39da29f7a0bac7f84cb7ed6d4b254062ed89bb713db7983963e1c4cee836a6"
    sha256 cellar: :any, arm64_linux:   "b2aa110e19dff4a8dfe83a34a0f4b8a6237644b6df9e5878429e61de7c55af0b"
    sha256 cellar: :any, x86_64_linux:  "0d83888e5deb4a6574dfe40a8a460dcc14cdf01fef7257c7bc44612213195bb5"
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
