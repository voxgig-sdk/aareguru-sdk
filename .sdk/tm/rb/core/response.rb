# Aareguru SDK response

require_relative '../utility/struct/voxgig_struct'

class AareguruResponse
  attr_accessor :status, :status_text, :headers, :json_func, :body, :err, :unreadable

  def initialize(resmap = {})
    resmap ||= {}
    s = VoxgigStruct.getprop(resmap, "status")
    @status = s.is_a?(Numeric) ? s.to_i : -1
    st = VoxgigStruct.getprop(resmap, "statusText")
    @status_text = st.is_a?(String) ? st : ""
    @headers = VoxgigStruct.getprop(resmap, "headers")
    jf = VoxgigStruct.getprop(resmap, "json")
    @json_func = jf.is_a?(Proc) ? jf : nil
    @body = VoxgigStruct.getprop(resmap, "body")
    @err = VoxgigStruct.getprop(resmap, "err")
    # Set by a transport that could not read a non-blank body as JSON.
    @unreadable = true == VoxgigStruct.getprop(resmap, "unreadable")
  end
end
