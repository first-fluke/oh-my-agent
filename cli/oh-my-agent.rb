class OhMyAgent < Formula
  desc "Portable multi-agent harness for .agents-based skills and workflows"
  homepage "https://firstfluke.com/oh-my-agent/"
  url "https://registry.npmjs.org/oh-my-agent/-/oh-my-agent-19.0.0.tgz"
  sha256 "b1c590bf6c2017cdd914bcd67a146e2f9d480050b450e4198cb473565a3eed2c"
  license "MIT"

  bottle do
    sha256 cellar: :any, arm64_golden_gate: "0d7348db04e2db22c49fce8d1427a49230e5607568c1e6f05b0f55403da1d8ad"
    sha256 cellar: :any, arm64_tahoe:       "64020c77012b5c3ee950264207f2d8843e00e190bda1f559698cde0a40acb4c0"
    sha256 cellar: :any, arm64_sequoia:     "af66634ee5562fa43677a841303d917a1f4f9d96bfd316cd16627556a7c6d189"
    sha256 cellar: :any, arm64_linux:       "9d081764d2d55be8df2a17a0d0b340014ef542947cc0232b7836f01bb408b8a7"
    sha256 cellar: :any, x86_64_linux:      "8e1f97b74c9e3c52aa6f7c77042a8550a368a405daa40f12b035a69e77da229e"
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
