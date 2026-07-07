// HƯỚNG DẪN CẬP NHẬT GOOGLE APPS SCRIPT CHO CHỨC NĂNG CẬP NHẬT SĐT
// 1. Mở file Google Sheets gốc của bạn (Link DL)
// 2. Chọn Tiện ích mở rộng > Apps Script
// 3. Sao chép và dán toàn bộ đoạn code dưới đây thay thế cho code cũ
// 4. Bấm "Triển khai" (Deploy) > "Quản lý bản triển khai" > Chỉnh sửa bản hiện tại chọn "Phiên bản mới" (New version).

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var spreadsheetId = data.spreadsheetId;
    var sheetName = data.sheetName || 'CapNhatSDT'; // Default for updatePhone
    
    var ss = SpreadsheetApp.openById(spreadsheetId);
    
    if (action === "updatePhone") {
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        // Create sheet if not exists
        sheet = ss.insertSheet(sheetName);
        sheet.appendRow(["STT", "Nhóm", "Ma_Khang", "Ten_Khang", "DCHI_KHANG", "DTHOAI_DVU CU", "DTHOAI_DVU MOI", "TGian_CAPNHAT", "Trạng Thái"]);
      }
      
      var lastRow = sheet.getLastRow();
      var stt = lastRow > 1 ? lastRow : 1; 
      
      var sdtCuStr = data.sdtCu ? "'" + data.sdtCu : "";
      var sdtMoiStr = data.sdtMoi ? "'" + data.sdtMoi : "";

      sheet.appendRow([
        stt,
        data.nhom,
        data.maKhang,
        data.tenKhang,
        data.diaChi,
        sdtCuStr,
        sdtMoiStr,
        data.thoiGian,
        data.trangThai
      ]);
      
      return ContentService.createTextOutput(JSON.stringify({ "status": "success", "message": "Updated phone" })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "updateStatus") {
      var sheet = ss.getSheetByName(sheetName || 'CapNhatSDT');
      if(!sheet) return ContentService.createTextOutput("Sheet not found");
      
      var values = sheet.getDataRange().getValues();
      var headers = values[0];
      var maKhangCol = headers.findIndex(h => h.toString().toLowerCase().trim() === "ma_khang" || h.toString().toLowerCase() === "mã khách hàng" || h.toString().toLowerCase() === "mã khách");
      if (maKhangCol === -1) maKhangCol = 2; // Default to col C (0-indexed 2)
      
      var trangThaiCol = headers.findIndex(h => h.toString().toLowerCase().trim() === "trạng thái" || h.toString().toLowerCase() === "trang_thai");
      if(trangThaiCol === -1) trangThaiCol = 8; // Default to col I (0-indexed 8)
      
      var updated = false;
      for(var i = 1; i < values.length; i++){
        if(values[i][maKhangCol] && values[i][maKhangCol].toString().trim() === data.maKhang.toString().trim()){
          sheet.getRange(i+1, trangThaiCol+1).setValue(data.trangThai);
          updated = true;
        }
      }
      
      if (updated) {
        return ContentService.createTextOutput(JSON.stringify({ "status": "success", "message": "Updated Status" })).setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": "Ma Khang not found" })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    if (action === "updateGroup") {
      var sheet = ss.getSheetByName('ChiaNhom');
      if(!sheet) {
        return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": "Sheet ChiaNhom not found" })).setMimeType(ContentService.MimeType.JSON);
      }
      
      var values = sheet.getDataRange().getValues();
      var headers = values[0];
      var maKhangCol = headers.findIndex(h => h.toString().toLowerCase().trim() === "ma_khang" || h.toString().toLowerCase() === "mã khách hàng" || h.toString().toLowerCase() === "mã khách");
      if (maKhangCol === -1) maKhangCol = 0; // default to col A
      
      var nhomCol = headers.findIndex(h => h.toString().toLowerCase().trim() === "nhóm" || h.toString().toLowerCase() === "nhom" || h.toString().toLowerCase() === "tên nhóm");
      if(nhomCol === -1) nhomCol = 2; // default to col C
      
      var updated = false;
      for(var i = 1; i < values.length; i++){
        if(values[i][maKhangCol] && values[i][maKhangCol].toString().trim() === data.maKhang.toString().trim()){
          sheet.getRange(i+1, nhomCol+1).setValue(data.newGroup);
          updated = true;
          break;
        }
      }
      
      if (!updated) {
        var newRow = new Array(headers.length).fill("");
        newRow[maKhangCol] = data.maKhang;
        newRow[nhomCol] = data.newGroup;
        
        var tenKhangCol = headers.findIndex(h => h.toString().toLowerCase().trim() === "tên khách hàng" || h.toString().toLowerCase() === "ten_khang");
        if (tenKhangCol !== -1 && data.tenKhang) newRow[tenKhangCol] = data.tenKhang;
        
        sheet.appendRow(newRow);
      }
      
      return ContentService.createTextOutput(JSON.stringify({ "status": "success", "message": "Updated Group" })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "updateLinkDL") {
      var sheet = ss.getSheetByName(sheetName);
      if(!sheet) return ContentService.createTextOutput("Sheet not found");
      
      var values = sheet.getDataRange().getValues();
      var headers = values[0];
      var maDVCol = headers.findIndex(h => h.toString().toLowerCase().trim() === data.maDV.toString().toLowerCase().trim() || h.toString().toLowerCase() === "mã đv" || h.toString().toLowerCase() === "ma_dv");
      if (maDVCol === -1) maDVCol = 1; // Default to col B
      
      var linkDLCol = headers.findIndex(h => h.toString().toLowerCase().trim() === "link dl" || h.toString().toLowerCase() === "link_dl");
      if(linkDLCol === -1) linkDLCol = 3; // Default to col D
      
      for(var i = 1; i < values.length; i++){
        if(values[i][maDVCol] && values[i][maDVCol].toString().toLowerCase() === data.maDV.toLowerCase()){
          sheet.getRange(i+1, linkDLCol+1).setValue(data["Link DL"]);
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ "status": "success", "message": "Updated Link" })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "updatePass") {
      var sheet = ss.getSheetByName(sheetName);
      if(!sheet) return ContentService.createTextOutput("Sheet not found");
      
      var values = sheet.getDataRange().getValues();
      var headers = values[0];
      var maDVCol = headers.findIndex(h => h.toString().toLowerCase().trim() === data.maDV.toString().toLowerCase().trim() || h.toString().toLowerCase() === "mã đv");
      if (maDVCol === -1) maDVCol = 1; 
      
      var passCol = headers.findIndex(h => h.toString().toLowerCase().trim() === "pass" || h.toString().toLowerCase() === "mật khẩu");
      if(passCol === -1) passCol = 5; 
      
      for(var i = 1; i < values.length; i++){
        if(values[i][maDVCol] && values[i][maDVCol].toString().toLowerCase() === data.maDV.toLowerCase()){
          sheet.getRange(i+1, passCol+1).setValue(data.newPass);
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ "status": "success", "message": "Updated Pass" })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": "Unknown action" })).setMimeType(ContentService.MimeType.JSON);
  } catch(e) {
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": e.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
