// HƯỚNG DẪN CẬP NHẬT GOOGLE APPS SCRIPT
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
      
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      
      var maKhangCol = headers.findIndex(h => h.toString().toLowerCase().trim() === "ma_khang" || h.toString().toLowerCase() === "mã khách hàng" || h.toString().toLowerCase() === "mã khách");
      if (maKhangCol === -1) maKhangCol = 2; // Default to col C (0-indexed 2)
      
      var trangThaiCol = headers.findIndex(h => h.toString().toLowerCase().trim() === "trạng thái" || h.toString().toLowerCase() === "trang_thai");
      if(trangThaiCol === -1) trangThaiCol = 8; // Default to col I (0-indexed 8)
      
      var updated = false;
      if (lastRow > 1) {
        var maKhangData = sheet.getRange(2, maKhangCol + 1, lastRow - 1, 1).getValues();
        for(var i = 0; i < maKhangData.length; i++){
          if(maKhangData[i][0] && maKhangData[i][0].toString().trim() === data.maKhang.toString().trim()){
            sheet.getRange(i+2, trangThaiCol+1).setValue(data.trangThai);
            updated = true;
          }
        }
      }
      
      if (updated) {
        return ContentService.createTextOutput(JSON.stringify({ "status": "success", "message": "Updated Status" })).setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": "Ma Khang not found" })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    if (action === "updateGroupBatch" || action === "updateGroup") {
      var sheet = ss.getSheetByName('ChiaNhom');
      if(!sheet) {
        return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": "Sheet ChiaNhom not found" })).setMimeType(ContentService.MimeType.JSON);
      }
      
      var lastRow = sheet.getLastRow();
      var lastCol = Math.max(sheet.getLastColumn(), 7); // Ensure at least 7 columns
      
      var headers = [];
      if (lastRow === 0) {
        headers = ["STT", "MA_KHANG", "TEN_KHANG", "NHÓM", "MA_SOGCS", "DOANHSO", "DCHI_KHANG"];
        sheet.appendRow(headers);
        lastRow = 1;
        lastCol = headers.length;
      } else {
        headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      }
      
      var sttCol = headers.findIndex(h => h.toString().toLowerCase().trim() === "stt");
      var maKhangCol = headers.findIndex(h => h.toString().toLowerCase().trim() === "ma_khang" || h.toString().toLowerCase() === "mã khách hàng" || h.toString().toLowerCase() === "mã khách");
      if (maKhangCol === -1) maKhangCol = 1;
      
      var nhomCol = headers.findIndex(h => h.toString().toLowerCase().trim() === "nhóm" || h.toString().toLowerCase() === "nhom" || h.toString().toLowerCase() === "tên nhóm");
      if(nhomCol === -1) nhomCol = 3;
      
      var tenKhangCol = headers.findIndex(h => h.toString().toLowerCase().trim() === "tên khách hàng" || h.toString().toLowerCase() === "ten_khang" || h.toString().toLowerCase() === "tên khách");
      var maSoGcsCol = headers.findIndex(h => h.toString().toLowerCase().trim() === "mã sổ gcs" || h.toString().toLowerCase() === "ma_sogcs");
      var danhSoCol = headers.findIndex(h => h.toString().toLowerCase().trim() === "doanh số" || h.toString().toLowerCase() === "danhso" || h.toString().toLowerCase() === "doanh so");
      var diaChiCol = headers.findIndex(h => h.toString().toLowerCase().trim() === "địa chỉ" || h.toString().toLowerCase() === "dchi_khang" || h.toString().toLowerCase() === "dia chi");

      var updates = action === "updateGroupBatch" ? data.updates : [data];
      var updatedCount = 0;
      var rowsToAppend = [];
      
      if (lastRow > 1) {
        // Tối ưu hóa: Chỉ đọc cột MA_KHANG thay vì toàn bộ bảng (tránh quá tải bộ nhớ và timeout với 300k rows)
        var maKhangData = sheet.getRange(2, maKhangCol + 1, lastRow - 1, 1).getValues();
        var maKhangToIndex = {};
        for(var i = 0; i < maKhangData.length; i++) {
          if(maKhangData[i][0] !== undefined && maKhangData[i][0] !== null && maKhangData[i][0] !== "") {
            maKhangToIndex[maKhangData[i][0].toString().trim()] = i + 2;
          }
        }
        
        var updatesByRow = {};
        for (var j = 0; j < updates.length; j++) {
          var update = updates[j];
          var mk = update.maKhang !== undefined && update.maKhang !== null ? update.maKhang.toString().trim() : "";
          if (mk === "") continue;
          
          if (maKhangToIndex.hasOwnProperty(mk)) {
            updatesByRow[maKhangToIndex[mk]] = update.newGroup;
            updatedCount++;
          } else {
            var newRow = new Array(Math.max(headers.length, 7)).fill("");
            if (sttCol !== -1) {
               newRow[sttCol] = lastRow === 0 ? 1 + rowsToAppend.length : lastRow + rowsToAppend.length;
            }
            newRow[maKhangCol] = update.maKhang;
            newRow[nhomCol] = update.newGroup;
            if (tenKhangCol !== -1 && update.tenKhang) newRow[tenKhangCol] = update.tenKhang;
            if (maSoGcsCol !== -1 && update.maSoGcs) newRow[maSoGcsCol] = update.maSoGcs;
            if (danhSoCol !== -1 && update.danhSo) newRow[danhSoCol] = update.danhSo;
            if (diaChiCol !== -1 && update.diaChi) newRow[diaChiCol] = update.diaChi;
            
            rowsToAppend.push(newRow);
            updatedCount++;
          }
        }
        
        var rowsToUpdate = Object.keys(updatesByRow).map(Number).sort(function(a, b){return a-b});
        if (rowsToUpdate.length > 0) {
           // Đọc nguyên cột Nhóm và chỉ update các dòng thay đổi trên memory, sau đó ghi đè lại cột Nhóm
           var nhomData = sheet.getRange(2, nhomCol + 1, lastRow - 1, 1).getValues();
           for (var r = 0; r < rowsToUpdate.length; r++) {
              var rowIndex = rowsToUpdate[r];
              nhomData[rowIndex - 2][0] = updatesByRow[rowIndex];
           }
           sheet.getRange(2, nhomCol + 1, lastRow - 1, 1).setValues(nhomData);
        }
      } else {
        for (var j = 0; j < updates.length; j++) {
          var update = updates[j];
          var newRow = new Array(Math.max(headers.length, 7)).fill("");
          if (sttCol !== -1) {
             newRow[sttCol] = rowsToAppend.length + 1;
          }
          newRow[maKhangCol] = update.maKhang;
          newRow[nhomCol] = update.newGroup;
          if (tenKhangCol !== -1 && update.tenKhang) newRow[tenKhangCol] = update.tenKhang;
          if (maSoGcsCol !== -1 && update.maSoGcs) newRow[maSoGcsCol] = update.maSoGcs;
          if (danhSoCol !== -1 && update.danhSo) newRow[danhSoCol] = update.danhSo;
          if (diaChiCol !== -1 && update.diaChi) newRow[diaChiCol] = update.diaChi;
          
          rowsToAppend.push(newRow);
          updatedCount++;
        }
      }
      
      if (rowsToAppend.length > 0) {
        sheet.getRange(lastRow + 1, 1, rowsToAppend.length, rowsToAppend[0].length).setValues(rowsToAppend);
      }
      
      return ContentService.createTextOutput(JSON.stringify({ "status": "success", "message": "Updated " + updatedCount + " groups" })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "updateLinkDL") {
      var sheet = ss.getSheetByName(sheetName);
      if(!sheet) return ContentService.createTextOutput("Sheet not found");
      
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      if (lastRow <= 1) return ContentService.createTextOutput("Sheet is empty");
      
      var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      var maDVCol = headers.findIndex(h => h.toString().toLowerCase().trim() === data.maDV.toString().toLowerCase().trim() || h.toString().toLowerCase() === "mã đv" || h.toString().toLowerCase() === "ma_dv");
      if (maDVCol === -1) maDVCol = 1; // Default to col B
      
      var linkDLCol = headers.findIndex(h => h.toString().toLowerCase().trim() === "link dl" || h.toString().toLowerCase() === "link_dl");
      if(linkDLCol === -1) linkDLCol = 3; // Default to col D
      
      var maDVData = sheet.getRange(2, maDVCol + 1, lastRow - 1, 1).getValues();
      for(var i = 0; i < maDVData.length; i++){
        if(maDVData[i][0] && maDVData[i][0].toString().toLowerCase() === data.maDV.toLowerCase()){
          sheet.getRange(i+2, linkDLCol+1).setValue(data["Link DL"]);
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ "status": "success", "message": "Updated Link" })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "updatePass") {
      var sheet = ss.getSheetByName(sheetName);
      if(!sheet) return ContentService.createTextOutput("Sheet not found");
      
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      if (lastRow <= 1) return ContentService.createTextOutput("Sheet is empty");
      
      var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      var maDVCol = headers.findIndex(h => h.toString().toLowerCase().trim() === data.maDV.toString().toLowerCase().trim() || h.toString().toLowerCase() === "mã đv");
      if (maDVCol === -1) maDVCol = 1; 
      
      var passCol = headers.findIndex(h => h.toString().toLowerCase().trim() === "pass" || h.toString().toLowerCase() === "mật khẩu");
      if(passCol === -1) passCol = 5; 
      
      var maDVData = sheet.getRange(2, maDVCol + 1, lastRow - 1, 1).getValues();
      for(var i = 0; i < maDVData.length; i++){
        if(maDVData[i][0] && maDVData[i][0].toString().toLowerCase() === data.maDV.toLowerCase()){
          sheet.getRange(i+2, passCol+1).setValue(data.newPass);
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
