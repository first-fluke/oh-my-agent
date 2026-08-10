class OhMyAgent < Formula
  desc "Portable multi-agent harness for .agents-based skills and workflows"
  homepage "https://firstfluke.com/oh-my-agent/"
  url "https://registry.npmjs.org/oh-my-agent/-/oh-my-agent-11.10.1.tgz"
  sha256 "8582549f4f3751375d32abfe2bcdad0f3c254bb28a9058266bea4e2706d2f62d"
  license "MIT"

  bottle do
    sha256 cellar: :any, arm64_tahoe:   "a04b10c8724a9600a1187697eec3638dec78e2c6ac1ddab4bf51767e560579ad"
    sha256 cellar: :any, arm64_sequoia: "ed546440b1b9d738fee6ecdb3c8730c93a3fde9591685cd47ad9f9e14f1625f6"
    sha256 cellar: :any, arm64_sonoma:  "529ba7aec47932ddb148ed6143d893d06ffe74dcf35b6ea4d8d2fef9fbe007a0"
    sha256 cellar: :any, sonoma:        "eb2db62464860c3dd2bb148b36614e676f308347eedabb10fd7125f5bd8c1384"
    sha256 cellar: :any, arm64_linux:   "038ad076a104551076bf48c7f4e44f0205a8e647e85bc1da94892aec78eed7bf"
    sha256 cellar: :any, x86_64_linux:  "8b0018f8f63e4a17bf6588d87ac23bbf6951f5837c8d9d819de39526ad7f49a3"
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
