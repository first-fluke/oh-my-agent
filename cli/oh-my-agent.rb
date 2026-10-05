class OhMyAgent < Formula
  desc "Portable multi-agent harness for .agents-based skills and workflows"
  homepage "https://firstfluke.com/oh-my-agent/"
  url "https://registry.npmjs.org/oh-my-agent/-/oh-my-agent-15.0.17.tgz"
  sha256 "c272c0f8defecba8df2490f2b2fc519ddf19cf0624eeb650693120f7579151c5"
  license "MIT"

  bottle do
    sha256 cellar: :any, arm64_golden_gate: "818cbe404fcb82dd2b28a4f4c1dbdf1aca5486fe4c56d36ef1bdffd4660049a7"
    sha256 cellar: :any, arm64_tahoe:       "f7fa9d46d7f2f9e56321467f317b859f6d18da7850d31298f69c85e6007e8388"
    sha256 cellar: :any, arm64_sequoia:     "12664d74f46f5a8118a8550007d70cb0ec40e808a2380665bb7ba15faa331145"
    sha256 cellar: :any, arm64_linux:       "d6f6469dc747b51504f3ca636e3a36bbeb792f7d269e57d4b56992d0a280053c"
    sha256 cellar: :any, x86_64_linux:      "298bee91f97ac44756f1a0b371354dccfc78fb8c43d5d85dbe60699c189f1e5a"
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
