class OhMyAgent < Formula
  desc "Portable multi-agent harness for .agents-based skills and workflows"
  homepage "https://firstfluke.com/oh-my-agent/"
  url "https://registry.npmjs.org/oh-my-agent/-/oh-my-agent-10.10.0.tgz"
  sha256 "147f39d34a8fe695846dfd5d0efdfc49394680b5058d0f948e74a28d6556ef6f"
  license "MIT"

  bottle do
    sha256 cellar: :any, arm64_tahoe:   "a11996ed30c37b1d83e8204131358df64d5df928683496af7167a5a51cb963b7"
    sha256 cellar: :any, arm64_sequoia: "4a5185a8a03bbc9ef9178352eb2c1a32e50bbe3a4f9550f165aac23f48f50815"
    sha256 cellar: :any, arm64_sonoma:  "4a5185a8a03bbc9ef9178352eb2c1a32e50bbe3a4f9550f165aac23f48f50815"
    sha256 cellar: :any, sonoma:        "150d13e3a24a97d5b4be747a2e021cda24ed0e3c29db6a037b2c19cbdaa89fa2"
    sha256 cellar: :any, arm64_linux:   "bb0fb63c71021103e6e9c500664d452f28ebd46b81032db46b4e6396a848df71"
    sha256 cellar: :any, x86_64_linux:  "bf9ba51dabf3b824168c1596f38a6e3eb5de2aa0ea5476c28fe7fb024850ebf7"
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
