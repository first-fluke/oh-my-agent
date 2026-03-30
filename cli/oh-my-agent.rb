class OhMyAgent < Formula
  desc "Portable multi-agent harness for .agents-based skills and workflows"
  homepage "https://github.com/first-fluke/oh-my-agent"
  url "https://registry.npmjs.org/oh-my-agent/-/oh-my-agent-4.16.0.tgz"
  sha256 "be433a94fc4224c8c57fcb44e7f5789d0b41bc712f3b08d72ab440791fb4907f"
  license "MIT"

  bottle do
    sha256 cellar: :any_skip_relocation, all: "78acf501dea38d87104ffb3aab7dfe58f53974ebef23061e54bed5c30013bbba"
  end

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink Dir[libexec/"bin/*"]
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/oh-my-ag --version")

    output = JSON.parse(shell_output("#{bin}/oh-my-ag memory:init --json"))
    assert_empty output["updated"]
    assert_path_exists testpath/".serena/memories/orchestrator-session.md"
    assert_path_exists testpath/".serena/memories/task-board.md"
  end
end
