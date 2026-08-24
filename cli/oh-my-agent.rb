class OhMyAgent < Formula
  desc "Portable multi-agent harness for .agents-based skills and workflows"
  homepage "https://firstfluke.com/oh-my-agent/"
  url "https://registry.npmjs.org/oh-my-agent/-/oh-my-agent-12.6.0.tgz"
  sha256 "b6ffa061f9dbab0b76701909fff3ab7752675f5bad9bdb4cb0785a28536371e0"
  license "MIT"

  bottle do
    sha256 cellar: :any, arm64_tahoe:   "9e17cf431219035f4f5b192799b3423ee246d4f6b80ef8330af6f908a8be4ae3"
    sha256 cellar: :any, arm64_sequoia: "03926d77fcbac16c996f0a35d01c45b02d33ae62003d532267c1c376ccc22a74"
    sha256 cellar: :any, arm64_sonoma:  "79b408131b036ad643690a4b01d39c2f12e65720f08c81dd0da074b085c5b7c2"
    sha256 cellar: :any, sonoma:        "a069d65880acb82fd8be3f79c6f9edc838d86f0711e891264f8bab8d63723a77"
    sha256 cellar: :any, arm64_linux:   "ae6281ac747615c2ad86651aa0603ab144e2fe710febfddc411a8746d3e6c8b2"
    sha256 cellar: :any, x86_64_linux:  "e34630c5f9b9fb5c0c93aa3c001222109bc17bc735198cbcc46f9742646c0ce2"
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
