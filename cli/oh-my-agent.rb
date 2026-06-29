class OhMyAgent < Formula
  desc "Portable multi-agent harness for .agents-based skills and workflows"
  homepage "https://firstfluke.com/oh-my-agent/"
  url "https://registry.npmjs.org/oh-my-agent/-/oh-my-agent-10.7.1.tgz"
  sha256 "a81d24614c541ff9d12df8d0c442aca3074f717b99a4de9dc18caa56b28b2d55"
  license "MIT"

  bottle do
    sha256 cellar: :any, arm64_tahoe:   "231c02b543350b503927c20bc626808eb2dd7654ec9d3dd134983e89a2376169"
    sha256 cellar: :any, arm64_sequoia: "1d0e0c077739a769fffe628607d406c90ea0877d066d5cd07e71f11a49731fb7"
    sha256 cellar: :any, arm64_sonoma:  "1d0e0c077739a769fffe628607d406c90ea0877d066d5cd07e71f11a49731fb7"
    sha256 cellar: :any, sonoma:        "eac84dac05a676bda1c3c8310c56a06ca7f54c2702ffb34f94171d8d96428bd7"
    sha256 cellar: :any, arm64_linux:   "dd28057150d6d8f7069364f16cd179b61f0ef9067305afc903a01c86f8f133be"
    sha256 cellar: :any, x86_64_linux:  "5da6c663de546d61823f09b97ef89ba53f502f488cabec3d6cc9e66eccab53e5"
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
