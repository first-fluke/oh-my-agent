class OhMyAgent < Formula
  desc "Portable multi-agent harness for .agents-based skills and workflows"
  homepage "https://firstfluke.com/oh-my-agent/"
  url "https://registry.npmjs.org/oh-my-agent/-/oh-my-agent-10.17.0.tgz"
  sha256 "829e1fa472604e35ba3abbbea5c02a3af4c3da5f778a8025b30327e835e572d5"
  license "MIT"

  bottle do
    sha256 cellar: :any, arm64_tahoe:   "860815f0bc15932c9b755a4267351991930fb6371279b408622583f0787687dc"
    sha256 cellar: :any, arm64_sequoia: "b14db7a9c8fd83626d0657a68d6e3d73c3c49d7487133762cee9854ae78a783a"
    sha256 cellar: :any, arm64_sonoma:  "b14db7a9c8fd83626d0657a68d6e3d73c3c49d7487133762cee9854ae78a783a"
    sha256 cellar: :any, sonoma:        "93be35795cfa4b66b5b315bdda71a82f5d4a5d0c1ed93a875378d43201dccf30"
    sha256 cellar: :any, arm64_linux:   "96d265e880340ce37a8757cd60a736ecc8d36f6a449f81624f1c0b8ac199f5da"
    sha256 cellar: :any, x86_64_linux:  "d4b3da25e115b48f028f8c4a486350f1a7d5ee281e9bcfb43465e76a0acec830"
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
