class OhMyAgent < Formula
  desc "Portable multi-agent harness for .agents-based skills and workflows"
  homepage "https://github.com/first-fluke/oh-my-agent"
  url "https://registry.npmjs.org/oh-my-agent/-/oh-my-agent-6.5.5.tgz"
  sha256 "9918488dd2b7041e14b8f2225a6aa2b061e1c223fdb010b49a5af161a1e9d2d8"
  license "MIT"

  bottle do
    sha256 cellar: :any,                 arm64_tahoe:   "393365dfe16505a2053b6f68083b276418ac3fe4940cb7971db15a7cd5bfe7d0"
    sha256 cellar: :any,                 arm64_sequoia: "dbda2da280cbde23f0ce69fd40e171360d37de732b47b9a9873d8147d1a06c65"
    sha256 cellar: :any,                 arm64_sonoma:  "dbda2da280cbde23f0ce69fd40e171360d37de732b47b9a9873d8147d1a06c65"
    sha256 cellar: :any,                 sonoma:        "b4209b0beafd885cb0d1090e10465be4627dfb9d1d12c46c00f5829fc26fcae2"
    sha256 cellar: :any_skip_relocation, arm64_linux:   "f46c276463ce7d4151e1756998964c243b6375ac9629f5dfeb0e0683cb961fca"
    sha256 cellar: :any_skip_relocation, x86_64_linux:  "1db504db2b0f022053efd8e0f40ee816386b2ef573bae9e49d05c9a39082a725"
  end

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args

    node_modules = libexec/"lib/node_modules/oh-my-agent/node_modules"
    # Remove incompatible pre-built `bare-fs`/`bare-os`/`bare-url` binaries
    os = OS.kernel_name.downcase
    arch = Hardware::CPU.intel? ? "x64" : Hardware::CPU.arch.to_s
    node_modules.glob("{bare-fs,bare-os,bare-url}/prebuilds/*")
                .each { |dir| rm_r(dir) if dir.basename.to_s != "#{os}-#{arch}" }

    bin.install_symlink Dir[libexec/"bin/*"]
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/oh-my-agent --version")

    output = JSON.parse(shell_output("#{bin}/oh-my-agent memory:init --json"))
    assert_empty output["updated"]
    assert_path_exists testpath/".serena/memories/orchestrator-session.md"
    assert_path_exists testpath/".serena/memories/task-board.md"
  end
end
