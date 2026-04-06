class OhMyAgent < Formula
  desc "Portable multi-agent harness for .agents-based skills and workflows"
  homepage "https://github.com/first-fluke/oh-my-agent"
  url "https://registry.npmjs.org/oh-my-agent/-/oh-my-agent-4.23.1.tgz"
  sha256 "43c5d042605484a205c730ae9dc4f506d07cf1ec0e696aaea7ffa8f5d800f5f8"
  license "MIT"

  bottle do
    sha256 cellar: :any_skip_relocation, all: "3e36bb965824adc2ce9c4025dbb625b1f88bb693abe5406f1b42c41e053bc67d"
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
