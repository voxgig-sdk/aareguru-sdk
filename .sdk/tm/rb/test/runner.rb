# Aareguru SDK test runner

require 'json'

module AareguruTestRunner
  @env = {}

  def self.load_env_local
    env_file = File.join(File.dirname(__FILE__), '..', '..', '.env.local')
    return unless File.exist?(env_file)

    File.readlines(env_file).each do |line|
      line = line.strip
      next if line.empty? || line.start_with?('#')
      key, val = line.split('=', 2)
      next unless key && val
      @env[key.strip] = val.strip
    end
  end

  def self.getenv(key)
    @env[key] || ENV[key]
  end

  def self.env_override(m)
    live = getenv("PROJECTNAME_TEST_LIVE")
    override = getenv("PROJECTNAME_TEST_OVERRIDE")

    if live == "TRUE" || override == "TRUE"
      m.each_key do |key|
        envval = getenv(key)
        if envval && !envval.empty?
          envval = envval.strip
          if envval.start_with?('{')
            begin
              parsed = JSON.parse(envval)
              m[key] = parsed
              next
            rescue JSON::ParserError
            end
          end
          m[key] = envval
        end
      end
    end

    explain = getenv("PROJECTNAME_TEST_EXPLAIN")
    m["PROJECTNAME_TEST_EXPLAIN"] = explain if explain && !explain.empty?

    m
  end

  def self.entity_list_to_data(list)
    out = []
    list.each do |item|
      if item.is_a?(Hash)
        out << item
      elsif item.respond_to?(:data_get)
        d = item.data_get
        out << d if d.is_a?(Hash)
      end
    end
    out
  end
end

# Module-level aliases for test convenience.
Runner = AareguruTestRunner
Helpers = AareguruHelpers
Vs = VoxgigStruct
