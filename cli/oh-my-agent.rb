class OhMyAgent < Formula
  desc "Portable multi-agent harness for .agents-based skills and workflows"
  homepage "https://firstfluke.com/oh-my-agent/"
  url "https://registry.npmjs.org/oh-my-agent/-/oh-my-agent-13.1.0.tgz"
  sha256 "6b66843a20cfe0466025e71bfbd373ac7448b5be7dc7160bd9185ddba2669fbe"
  license "MIT"

  bottle do
    sha256 cellar: :any, arm64_tahoe:   "76c5392309091955b87ddd012d6dac277567b774d510d3fed40e24136eeb1e56"
    sha256 cellar: :any, arm64_sequoia: "b7c991808d770bf705548e50ca42abfa2d378da702540e3c9fde9ba4918a8abf"
    sha256 cellar: :any, arm64_sonoma:  "a46bab5e6e26209c4cd1c3d586f35068d2e0b88ddaae119c0540d6ff878297d1"
    sha256 cellar: :any, arm64_linux:   "be7ff3d5e6f8bf23a8cf56f42fd67dbab00e903a789f3d3e7aae72adab050891"
    sha256 cellar: :any, x86_64_linux:  "9f15234132896cdca942d1048b48103389376e02bd5781d07e67816d25483b13"
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
