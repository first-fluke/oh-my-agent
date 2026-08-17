class OhMyAgent < Formula
  desc "Portable multi-agent harness for .agents-based skills and workflows"
  homepage "https://firstfluke.com/oh-my-agent/"
  url "https://registry.npmjs.org/oh-my-agent/-/oh-my-agent-12.3.2.tgz"
  sha256 "c8beca5b13714e5fcdd7d6fe222a5caade25e602941920fe90c8a15fbe48783f"
  license "MIT"

  bottle do
    sha256 cellar: :any, arm64_tahoe:   "df90fdd259fe44fd4baf26783d312ae5108c83fbe74e487dad68994823e08b39"
    sha256 cellar: :any, arm64_sequoia: "b302336eba723be143addad9fcdfb7acb7ee356fc7ec6fcfdc485f2c731e8f60"
    sha256 cellar: :any, arm64_sonoma:  "335dd24026c8d2075a1b5a43c68d86253e35a3c91805862899ec8c089bbbc7c5"
    sha256 cellar: :any, sonoma:        "1f908a2dd25e14b22dba009c89f264ff24ec43b2fdb850103b2500b263a0fd04"
    sha256 cellar: :any, arm64_linux:   "6959d0fa36897b5a337f4646b49784f4e842ae6c11ea1da01536791ff4a19a04"
    sha256 cellar: :any, x86_64_linux:  "8533959a28620c7c922bbdbed048544eab93e0a13159a32af1be77e7404e70f8"
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
